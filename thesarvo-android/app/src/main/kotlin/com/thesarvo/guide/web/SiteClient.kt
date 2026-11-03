package com.thesarvo.guide.web

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import com.thesarvo.core.GenerationIndex
import com.thesarvo.core.PathResolver
import com.thesarvo.core.Resolved
import com.thesarvo.guide.Prefs
import com.thesarvo.guide.store.BlobStore
import com.thesarvo.guide.store.PrivateStore
import com.thesarvo.guide.sync.Http
import java.io.ByteArrayInputStream
import java.io.IOException
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Request

/**
 * Answers the page's requests for `https://app.thesarvo.invalid/...` from the blob store through the current generation's path index
 * (`WebViewClient.shouldInterceptRequest`, on a WebView IO thread). Online-only things go to the real server and fail cleanly offline.
 */
class SiteClient(private val store: BlobStore, private val prefs: Prefs, private val privateStore: () -> PrivateStore) {
    @Volatile var index = GenerationIndex()

    fun handle(request: WebResourceRequest): WebResourceResponse {
        val url = request.url
        val path = url.encodedPath ?: "/"
        if (path.startsWith(PrivateStore.IMAGE_PREFIX)) {
            val file = privateStore().imageFile(java.net.URLDecoder.decode(path.replace("+", "%2B"), "UTF-8"))
            return if (file != null) response("image/jpeg", 200, file.inputStream(), mapOf("Cache-Control" to "private, no-store")) else notFound()
        }
        return when (val r = PathResolver.resolve(path, url.encodedQuery, index)) {
            is Resolved.Blob -> {
                val stream = store.open(r.hash) ?: return notFound()
                response(r.mime, 200, stream, mapOf("Cache-Control" to if (r.mime.startsWith("text/html")) "no-store" else "public, max-age=31536000, immutable"))
            }
            Resolved.Proxy -> proxy(request)
            // Only this handler answers 404 here; the "API routes never 404" rule is for the CloudFront API, which this never reaches.
            Resolved.NotFound -> notFound()
        }
    }

    private fun notFound() = response("text/plain; charset=utf-8", 404, ByteArrayInputStream("Not found".toByteArray()), emptyMap())

    private fun response(mime: String, status: Int, body: java.io.InputStream, headers: Map<String, String>): WebResourceResponse {
        val type = mime.substringBefore(';').trim()
        val charset = if ("charset=" in mime) mime.substringAfter("charset=").trim() else null
        return WebResourceResponse(type, charset, status, reason(status), headers, body)
    }

    private fun reason(status: Int) = when (status) { 200 -> "OK"; 404 -> "Not Found"; 502 -> "Bad Gateway"; 503 -> "Service Unavailable"; else -> "Status $status" }

    private fun proxy(request: WebResourceRequest): WebResourceResponse {
        val u = request.url
        val target = (prefs.baseUrl + u.encodedPath + (u.encodedQuery?.let { "?$it" } ?: "")).toHttpUrlOrNull() ?: return response("text/plain", 502, ByteArrayInputStream(ByteArray(0)), emptyMap())
        val out = Request.Builder().url(target)
        for ((k, v) in request.requestHeaders) if (k.lowercase() in PASSED) out.header(k, v)
        return try {
            val resp = Http.client.newCall(out.method(if (request.method == "HEAD") "HEAD" else "GET", null).build()).execute()
            val type = resp.header("Content-Type") ?: "application/octet-stream"
            response(type, resp.code, resp.body.byteStream(), mapOf("Cache-Control" to "no-store"))
        } catch (e: IOException) {
            response("application/json", 503, ByteArrayInputStream("""{"offline":true}""".toByteArray()), mapOf("X-Thesarvo-Offline" to "1"))
        }
    }

    private companion object { val PASSED = setOf("accept", "authorization") }
}
