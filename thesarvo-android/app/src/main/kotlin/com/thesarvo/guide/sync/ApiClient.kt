package com.thesarvo.guide.sync

import com.thesarvo.guide.Prefs
import java.io.IOException
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

data class ApiAnswer(val status: Int, val body: String)

/** The page's call to our own API, made here with the signed-in person's ID token. Status 0 means no network (the page treats it as offline). */
class ApiClient(private val prefs: Prefs) {
    suspend fun perform(method: String, path: String, headers: Map<String, String>, body: String?, idToken: String?): ApiAnswer {
        val url = (prefs.apiUrl + path).toHttpUrlOrNull() ?: return ApiAnswer(400, """{"error":"Bad path"}""")
        val builder = Request.Builder().url(url)
        var contentType: String? = null
        for ((k, v) in headers) {
            val key = k.lowercase()
            if (key == "authorization" || key == "host" || key == "content-length") continue
            if (key == "content-type") contentType = v
            builder.header(k, v)
        }
        if (idToken != null) builder.header("authorization", "Bearer $idToken")
        val m = method.uppercase()
        val requestBody = if (m == "GET" || m == "HEAD") null else (body ?: "").toRequestBody(contentType?.toMediaTypeOrNull())
        builder.method(m, requestBody)
        return try {
            Http.client.newCall(builder.build()).await().use { ApiAnswer(it.code, it.body.string()) }
        } catch (e: IOException) {
            ApiAnswer(0, "")
        }
    }
}
