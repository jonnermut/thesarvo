package com.thesarvo.guide.store

import android.content.res.AssetManager
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import com.thesarvo.core.AppManifest

object Hashing {
    fun sha256(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { s -> val buf = ByteArray(1 shl 16); while (true) { val n = s.read(buf); if (n < 0) break; md.update(buf, 0, n) } }
        return hex(md.digest())
    }

    fun sha256(bytes: ByteArray): String = hex(MessageDigest.getInstance("SHA-256").digest(bytes))

    private fun hex(b: ByteArray) = b.joinToString("") { "%02x".format(it) }
}

class HashMismatch : IOException("The downloaded file does not match its hash")

@Serializable
data class StoreState(val etag: String? = null, val lastCheck: Long? = null, val bootPending: Boolean = false, val freshSwitch: Boolean? = null)

/**
 * Every file downloaded, named by its SHA-256 (one copy however many paths use it), in two layers: the store in `noBackupFilesDir`,
 * and the read-only seed in the install-time asset pack (`seed/blobs/<hash>`, `seed/seed-manifest.json`).
 */
class BlobStore(val root: File, private val assets: AssetManager? = null) {
    private val blobs = File(root, "blobs").also { it.mkdirs() }
    private val json = Json { ignoreUnknownKeys = true }
    private val seedHashes: Set<String> by lazy { seedNames() }
    private val lock = Any()

    private fun storeFile(hash: String) = File(File(blobs, hash.take(2)), hash)

    private fun seedNames(): Set<String> = try { assets?.list("seed/blobs")?.toSet() ?: emptySet() } catch (e: IOException) { emptySet() }

    fun hasStored(hash: String) = storeFile(hash).exists()

    /** A stream of a blob (store first, then the seed), or null. */
    fun open(hash: String): InputStream? {
        val f = storeFile(hash)
        if (f.exists()) return try { f.inputStream() } catch (e: IOException) { null }
        if (hash in seedHashes) return try { assets?.open("seed/blobs/$hash", AssetManager.ACCESS_STREAMING) } catch (e: IOException) { null }
        return null
    }

    fun readBytes(hash: String): ByteArray? = open(hash)?.use { it.readBytes() }

    fun length(hash: String): Long = storeFile(hash).takeIf { it.exists() }?.length() ?: -1

    fun storedHashes(): Set<String> {
        val out = HashSet<String>()
        blobs.listFiles()?.forEach { d -> d.list()?.let { out.addAll(it) } }
        return out
    }

    fun presentHashes(): Set<String> = storedHashes() + seedHashes

    /** Moves a finished download into the store if (and only if) its bytes hash to [hash]. */
    fun put(temp: File, hash: String) {
        if (Hashing.sha256(temp) != hash) { temp.delete(); throw HashMismatch() }
        val dest = storeFile(hash)
        dest.parentFile!!.mkdirs()
        if (dest.exists()) { temp.delete(); return }
        if (!temp.renameTo(dest)) { temp.copyTo(dest, overwrite = true); temp.delete() }
    }

    fun newTemp(): File = File.createTempFile("dl", ".tmp", File(root, "tmp").also { it.mkdirs() })

    fun remove(hashes: Iterable<String>) { for (h in hashes) storeFile(h).delete() }

    fun storedBytes(): Long = blobs.walkTopDown().filter { it.isFile }.sumOf { it.length() }

    fun wipe() {
        blobs.deleteRecursively()
        blobs.mkdirs()
        File(root, "tmp").deleteRecursively()
    }

    // kept manifests (the "generations")

    private fun manifestFile(name: String) = File(root, "$name.json")

    fun loadManifest(name: String): AppManifest? = try { json.decodeFromString(AppManifest.serializer(), manifestFile(name).readText()) } catch (e: Exception) { null }

    fun saveManifest(data: ByteArray, name: String) { atomicWrite(manifestFile(name), data) }

    /** The downloaded candidate becomes current; the old current is kept as the rollback. */
    fun promoteCandidate() = synchronized(lock) {
        val cand = manifestFile("candidate")
        if (!cand.exists()) return@synchronized
        val cur = manifestFile("current")
        if (cur.exists()) { manifestFile("previous").delete(); cur.renameTo(manifestFile("previous")) }
        cand.renameTo(cur)
    }

    fun removeManifest(name: String) { manifestFile(name).delete() }

    fun loadSeedManifest(): AppManifest? = try {
        json.decodeFromString(AppManifest.serializer(), assets!!.open("seed/seed-manifest.json").use { it.readBytes().decodeToString() })
    } catch (e: Exception) { null }

    // small state file

    fun loadState(): StoreState = try { json.decodeFromString(StoreState.serializer(), File(root, "state.json").readText()) } catch (e: Exception) { StoreState() }

    fun saveState(s: StoreState) = synchronized(lock) { atomicWrite(File(root, "state.json"), json.encodeToString(StoreState.serializer(), s).toByteArray()) }

    /** Reads, changes and writes the state as one step (a worker and the app can both do it). */
    fun updateState(change: (StoreState) -> StoreState): StoreState = synchronized(lock) { change(loadState()).also { atomicWrite(File(root, "state.json"), json.encodeToString(StoreState.serializer(), it).toByteArray()) } }

    companion object {
        fun atomicWrite(f: File, data: ByteArray) {
            f.parentFile?.mkdirs()
            val tmp = File(f.parentFile, f.name + ".part")
            tmp.writeBytes(data)
            if (!tmp.renameTo(f)) { f.delete(); tmp.renameTo(f) }
        }
    }
}
