package com.thesarvo.guide.store

import com.thesarvo.guide.AppConfig
import com.thesarvo.guide.sync.ApiClient
import com.thesarvo.guide.sync.Http
import com.thesarvo.guide.sync.ApiAnswer
import com.thesarvo.guide.sync.await
import java.io.File
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.Request

/**
 * What the signed-in person's private guides need offline, kept in `<store>/private/`: apart from the public blob store, never in the
 * seed, and removed whole on sign-out. Filled from `GET /g/api/app-private-manifest` (pages, tree grafts, signed photo links).
 */
class PrivateStore(storeRoot: File) {
    val root = File(storeRoot, "private")
    private val manifestFile get() = File(root, "manifest.json")

    data class Photo(val guide: String, val name: String, val url: String)

    private fun obj(): JsonObject? = try { Json.parseToJsonElement(manifestFile.readText()).jsonObject } catch (e: Exception) { null }

    val isFilled get() = obj() != null

    fun save(manifest: String) {
        val o = try { Json.parseToJsonElement(manifest).jsonObject } catch (e: Exception) { throw HashMismatch() }
        if (o["schema"]?.jsonPrimitive?.int != 1 || o["pages"] !is JsonObject) throw HashMismatch()
        BlobStore.atomicWrite(manifestFile, manifest.toByteArray())
    }

    fun photos(): List<Photo> = (obj()?.get("images") as? JsonArray)?.mapNotNull { e ->
        val d = e as? JsonObject ?: return@mapNotNull null
        fun s(k: String) = (d[k] as? JsonPrimitive)?.contentOrNull
        Photo(s("g") ?: return@mapNotNull null, s("n") ?: return@mapNotNull null, s("u") ?: return@mapNotNull null)
    } ?: emptyList()

    fun imageFile(guide: String, name: String) = File(File(File(root, "images"), guide.filter { it.isLetterOrDigit() || it == '-' || it == '_' }), Hashing.sha256(name.toByteArray()))

    fun hasImage(p: Photo) = imageFile(p.guide, p.name).exists()

    fun putImage(temp: File, p: Photo) {
        val dest = imageFile(p.guide, p.name)
        dest.parentFile!!.mkdirs()
        dest.delete()
        if (!temp.renameTo(dest)) { temp.copyTo(dest, overwrite = true); temp.delete() }
    }

    /** The file for `/private-images/<guide>/<name>`, if downloaded. */
    fun imageFile(path: String): File? {
        if (!path.startsWith(IMAGE_PREFIX)) return null
        val parts = path.removePrefix(IMAGE_PREFIX).split('/', limit = 2)
        if (parts.size != 2) return null
        val name = try { URLDecoder.decode(parts[1].replace("+", "%2B"), "UTF-8") } catch (e: IllegalArgumentException) { return null }
        return imageFile(parts[0], name).takeIf { it.exists() }
    }

    /**
     * What the server would answer for a private page or the private tree, from the stored manifest; null when it is not a private call or
     * not stored. Photo links in a page point at the local copies, which the site client serves.
     */
    fun offlineAnswer(path: String): ApiAnswer? {
        val o = obj() ?: return null
        val route = path.substringBefore('?')
        val query = path.substringAfter('?', "")
        return when (route) {
            "/g/api/private-tree" -> ApiAnswer(200, (o["grafts"] ?: JsonArray(emptyList())).toString())
            "/g/api/private" -> {
                val id = query.split('&').firstOrNull { it.startsWith("id=") }?.removePrefix("id=")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
                val page = (o["pages"] as? JsonObject)?.get(id) as? JsonObject ?: return null
                val images = buildJsonObject {
                    for (p in photos()) if (p.guide == id && hasImage(p)) put(p.name, "${AppConfig.ORIGIN}$IMAGE_PREFIX$id/${URLEncoder.encode(p.name, "UTF-8").replace("+", "%20")}")
                }
                ApiAnswer(200, JsonObject(page + ("images" to images)).toString())
            }
            else -> null
        }
    }

    fun storedBytes(): Long = root.walkTopDown().filter { it.isFile }.sumOf { it.length() }

    fun wipe() { root.deleteRecursively() }

    companion object { const val IMAGE_PREFIX = "/private-images/" }
}

object PrivateSync {
    class Failure(val kind: Kind, val status: Int = 0) : Exception(kind.name) { enum class Kind { Offline, SignedOut, Server } }

    /** Fetches the private manifest with the person's token, stores it, and downloads the photos not yet stored. Returns the number of photos fetched. */
    suspend fun fill(store: PrivateStore, idToken: String?, api: ApiClient, concurrency: Int = 4): Int {
        if (idToken == null) throw Failure(Failure.Kind.SignedOut)
        val a = api.perform("GET", "/g/api/app-private-manifest", emptyMap(), null, idToken)
        if (a.status == 0) throw Failure(Failure.Kind.Offline)
        if (a.status != 200) throw Failure(Failure.Kind.Server, a.status)
        store.save(a.body)
        val todo = store.photos().filter { !store.hasImage(it) }
        val gate = Semaphore(concurrency)
        val fetched = AtomicInteger()
        coroutineScope {
            todo.map { p ->
                async(Dispatchers.IO) {
                    gate.withPermit {
                        val temp = File.createTempFile("pv", ".tmp", store.root.also { it.mkdirs() })
                        try {
                            Http.client.newCall(Request.Builder().url(p.url).build()).await().use { r ->
                                if (r.code == 200) {
                                    r.body.byteStream().use { src -> temp.outputStream().use { src.copyTo(it) } }
                                    store.putImage(temp, p)
                                    fetched.incrementAndGet()
                                }
                            }
                        } catch (e: CancellationException) { throw e } catch (e: Exception) { /* tried again next time */ } finally { temp.delete() }
                    }
                }
            }.forEach { it.await() }
        }
        return fetched.get()
    }
}
