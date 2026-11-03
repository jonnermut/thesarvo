package com.thesarvo.core

import java.net.URLDecoder

/** Where a request for the app origin's `<path>` is answered from. Pure, so it is unit tested. */
sealed interface Resolved {
    data class Blob(val hash: String, val mime: String) : Resolved
    data object Proxy : Resolved
    data object NotFound : Resolved
}

object PathResolver {
    private val mimeTypes = mapOf(
        "html" to "text/html; charset=utf-8", "js" to "text/javascript; charset=utf-8", "mjs" to "text/javascript; charset=utf-8", "css" to "text/css; charset=utf-8",
        "json" to "application/json; charset=utf-8", "svg" to "image/svg+xml", "kml" to "application/vnd.google-earth.kml+xml", "gpx" to "application/gpx+xml",
        "jpg" to "image/jpeg", "jpeg" to "image/jpeg", "png" to "image/png", "gif" to "image/gif", "webp" to "image/webp", "ico" to "image/x-icon",
        "txt" to "text/plain; charset=utf-8", "xml" to "application/xml", "woff2" to "font/woff2", "woff" to "font/woff", "pdf" to "application/pdf",
    )

    fun extension(path: String): String {
        val name = path.substringAfterLast('/')
        return if ('.' in name) name.substringAfterLast('.').lowercase() else ""
    }

    fun mime(path: String): String = mimeTypes[extension(path)] ?: "application/octet-stream"

    /** The variants to try, best first, for the one asked for. */
    fun variantOrder(wanted: Variant): List<Variant> = when (wanted) {
        Variant.S -> listOf(Variant.S, Variant.M, Variant.L)
        Variant.M -> listOf(Variant.M, Variant.L, Variant.S)
        Variant.L -> listOf(Variant.L, Variant.M, Variant.S)
    }

    private fun decode(s: String): String = try { URLDecoder.decode(s.replace("+", "%2B"), "UTF-8") } catch (e: IllegalArgumentException) { s }

    fun resolve(rawPath: String, query: String?, index: GenerationIndex): Resolved {
        var path = decode(rawPath)
        if (path.isEmpty()) path = "/"
        index.paths[path]?.let { return Resolved.Blob(it, mime(path)) }
        val trimmed = if (path.length > 1 && path.endsWith("/")) path.dropLast(1) else path
        val dir = if (trimmed == "/") "/index.html" else "$trimmed/index.html"
        index.paths[dir]?.let { return Resolved.Blob(it, "text/html; charset=utf-8") }

        if (path.startsWith("/images/")) {
            val key = path.removePrefix("/images/")
            val asked = Variant.of(queryValue(query, "v")) ?: Variant.M
            index.images[key]?.let { e ->
                for (v in variantOrder(asked)) e.hash(v)?.let { return Resolved.Blob(it, if (e.x == "png") "image/png" else "image/jpeg") }
            }
            return Resolved.Proxy
        }
        if (path.startsWith("/g/api/") || path.startsWith("/g-data/") || path.startsWith("/private/")) return Resolved.Proxy
        // A page that was not prerendered (or a route only the client knows): the app shell hydrates it.
        if (path.startsWith("/g/") && extension(path).isEmpty()) index.paths["/g/index.html"]?.let { return Resolved.Blob(it, "text/html; charset=utf-8") }
        return Resolved.NotFound
    }

    fun queryValue(query: String?, name: String): String? {
        if (query == null) return null
        for (pair in query.split('&')) {
            val kv = pair.split('=', limit = 2)
            if (kv.size == 2 && kv[0] == name) return kv[1]
        }
        return null
    }
}
