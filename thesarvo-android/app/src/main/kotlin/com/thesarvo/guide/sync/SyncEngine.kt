package com.thesarvo.guide.sync

import com.thesarvo.core.AppManifest
import com.thesarvo.core.Download
import com.thesarvo.core.Policy
import com.thesarvo.core.Selection
import com.thesarvo.core.SyncPlan
import com.thesarvo.guide.AppConfig
import com.thesarvo.guide.Prefs
import com.thesarvo.guide.store.BlobStore
import com.thesarvo.guide.store.HashMismatch
import java.io.IOException
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request

data class SyncProgress(val phase: String, val doneBytes: Long = 0, val totalBytes: Long = 0, val doneFiles: Int = 0, val totalFiles: Int = 0)

class SyncException(message: String) : Exception(message)

/** What one pass did: the manifest now current, and how many photos are still to fetch (a slice ends at its deadline). */
data class SyncResult(val manifest: AppManifest?, val remaining: Int)

interface SyncHooks {
    /** A manifest is complete for its text files: make it the current generation. */
    suspend fun switchTo(manifest: AppManifest)
    /** More blobs arrived for the current manifest: rebuild the path index. */
    suspend fun refresh()
    suspend fun progress(p: SyncProgress)
}

/**
 * Checks the manifest, downloads what is missing (verified by hash), and tells the model when a new generation is ready.
 * The pure decisions are in `SyncPlan` (core); this class is the I/O around it. One pass at a time per process.
 */
class SyncEngine(private val store: BlobStore, private val prefs: Prefs, private val net: NetworkState, private val freeBytes: () -> Long) {
    private val json = Json { ignoreUnknownKeys = true }
    @Volatile private var running = false

    val isRunning get() = running

    suspend fun run(current: AppManifest?, policy: Policy, allowCellularImages: Boolean, hooks: SyncHooks, deadlineMs: Long = Long.MAX_VALUE): SyncResult {
        if (running) return SyncResult(current, 0)
        running = true
        try { return pass(current, policy, allowCellularImages, hooks, deadlineMs) } finally { running = false }
    }

    private suspend fun pass(current: AppManifest?, policy: Policy, allowCellularImages: Boolean, hooks: SyncHooks, deadlineMs: Long): SyncResult {
        hooks.progress(SyncProgress("Checking for updates"))
        val state = store.loadState()
        val req = Request.Builder().url("${prefs.baseUrl}/app/v1/manifest.json").cacheControl(okhttp3.CacheControl.FORCE_NETWORK).apply { if (state.etag != null && current != null) header("If-None-Match", state.etag) }.build()
        var manifest = current
        Http.client.newCall(req).await().use { resp ->
            val status = resp.code
            val checked = store.updateState { it.copy(lastCheck = System.currentTimeMillis()) }
            if (status == 200) {
                val data = resp.body.bytes()
                val m = try { json.decodeFromString(AppManifest.serializer(), data.decodeToString()) } catch (e: Exception) { throw SyncException("The update list could not be read.") }
                if (m.schema != 1) throw SyncException("The update list could not be read.")
                if (m.minShell > AppConfig.SHELL_VERSION) throw SyncException("A newer version of the app is needed for the latest content.")
                store.saveManifest(data, "candidate")
                store.saveState(checked.copy(etag = resp.header("Etag")))
                manifest = m
            } else if (status != 304) {
                throw SyncException(if (status == 404) "The app's guides are not published on the server yet, so you have the ones that came with the app." else "The server answered $status.")
            }
        }
        val target = manifest ?: return SyncResult(null, 0)

        var effective = policy
        if (freeBytes() < 500_000_000) effective = effective.copy(m = Selection.None, l = Selection.None)
        val plan = SyncPlan.diff(target, store.presentHashes(), effective)
        val isNew = target.contentCommit != current?.contentCommit || target.builtAt != current.builtAt
        if (plan.downloads.isEmpty()) {
            if (isNew) hooks.switchTo(target)
            hooks.progress(SyncProgress("Up to date"))
            collectGarbage(target)
            return SyncResult(target, 0)
        }

        val totalBytes = plan.downloads.sumOf { it.size.toLong() }
        val doneBytes = AtomicLong()
        val doneFiles = AtomicInteger()
        fun snapshot(phase: String = "Downloading") = SyncProgress(phase, doneBytes.get(), totalBytes, doneFiles.get(), plan.downloads.size)
        hooks.progress(snapshot())
        var switched = !isNew
        val text = plan.downloads.filter { it.isText }
        // Photos wait for the next pass on a metered connection without permission.
        val photosAll = plan.downloads.filter { !it.isText }
        val photos = if (allowCellularImages || !net.isMetered) photosAll else emptyList()
        if (text.isEmpty() && !switched) { switched = true; hooks.switchTo(target) }

        fetchAll(text, deadlineMs = Long.MAX_VALUE) { d -> doneBytes.addAndGet(d.size.toLong()); doneFiles.incrementAndGet(); hooks.progress(snapshot()) }
        if (!switched) hooks.switchTo(target)

        var failed = 0
        var untouched = 0
        if (photos.isNotEmpty()) {
            val since = AtomicInteger()
            val result = fetchAll(photos, deadlineMs) { d ->
                doneBytes.addAndGet(d.size.toLong()); doneFiles.incrementAndGet()
                hooks.progress(snapshot())
                if (since.incrementAndGet() >= 40) { since.set(0); hooks.refresh() }
            }
            failed = result.failed
            untouched = result.skipped
        }
        hooks.refresh()
        if (untouched > 0) return SyncResult(target, untouched + failed)
        if (failed > 0) throw SyncException("$failed photos could not be downloaded; they will be tried again.")
        hooks.progress(snapshot("Up to date"))
        collectGarbage(target)
        return SyncResult(target, photosAll.size - photos.size)
    }

    private class Fetched(val failed: Int, val skipped: Int)

    /** Downloads in parallel (six at a time); a failure of one does not stop the rest; stops starting new files at the deadline. */
    private suspend fun fetchAll(items: List<Download>, deadlineMs: Long, done: suspend (Download) -> Unit): Fetched = coroutineScope {
        val gate = Semaphore(MAX_CONCURRENT)
        val failed = AtomicInteger()
        val skipped = AtomicInteger()
        items.map { d ->
            async(Dispatchers.IO) {
                gate.withPermit {
                    ensureActive()
                    if (System.currentTimeMillis() > deadlineMs) { skipped.incrementAndGet(); return@withPermit }
                    try { fetch(d); done(d) } catch (e: CancellationException) { throw e } catch (e: Exception) {
                        // A text file that cannot be fetched fails the pass (the generation would be incomplete); a photo is tried again later.
                        if (d.isText) throw SyncException("Could not download ${d.path}: ${e.message}")
                        failed.incrementAndGet()
                    }
                }
            }
        }.forEach { it.await() }
        Fetched(failed.get(), skipped.get())
    }

    private suspend fun fetch(d: Download) {
        val base = prefs.baseUrl.toHttpUrl()
        val url = base.newBuilder().addEncodedPathSegments(d.path.split('/').joinToString("/") { java.net.URLEncoder.encode(it, "UTF-8").replace("+", "%20") }).apply { if (!d.path.startsWith("images-app/")) addQueryParameter("h", d.hash) }.build()
        var last: Exception = IOException("no attempt")
        for (attempt in 0 until 3) {
            val temp = store.newTemp()
            try {
                Http.client.newCall(Request.Builder().url(url).build()).await().use { resp ->
                    if (resp.code != 200) throw IOException("The server answered ${resp.code}.")
                    withContext(Dispatchers.IO) { resp.body.byteStream().use { src -> temp.outputStream().use { src.copyTo(it) } } }
                }
                try { store.put(temp, d.hash) } catch (e: HashMismatch) { throw IOException("The guides changed while downloading; try again.") }
                return
            } catch (e: CancellationException) { temp.delete(); throw e } catch (e: Exception) {
                temp.delete()
                last = e
                delay((attempt + 1) * 500L)
            }
        }
        throw last
    }

    /** Deletes stored blobs that no kept manifest lists (any variant), after a switch has succeeded. */
    private fun collectGarbage(target: AppManifest) {
        val keep = HashSet<String>()
        val all = Policy(Selection.All, Selection.All, Selection.All)
        for (m in listOfNotNull(target, store.loadManifest("previous"))) keep += SyncPlan.wanted(m, all).map { it.hash }
        store.remove(store.storedHashes() - keep)
    }

    companion object { const val MAX_CONCURRENT = 6 }
}
