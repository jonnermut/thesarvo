package com.thesarvo.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** A save the page could not send (no network), kept as a file so the OS cannot evict it like web storage. One entry per guide. */
@Serializable
data class QueuedSave(val guide: String, val email: String, val body: String, val queuedAt: Long)

object EditQueueFormat {
    const val SAVE_PATH = "/g/api/save"

    /** The guide id in a save request body, or null when it is not a save we can queue. */
    fun guideId(body: String?): String? {
        if (body == null) return null
        return try {
            Json.parseToJsonElement(body).jsonObject["guide"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotEmpty() }
        } catch (e: Exception) {
            null
        }
    }

    /** A file name for a guide id: letters and digits only, so it stays inside the queue folder. */
    fun fileName(guide: String): String = guide.filter { it.isLetterOrDigit() } + ".json"
}

object SharedFileName {
    private val bad = "/\\:?*\"<>|".toSet()

    /** The name is cleaned so it stays inside the temporary folder. */
    fun clean(name: String): String {
        val c = name.map { if (it in bad || it.isISOControl()) '-' else it }.joinToString("").trim('.', ' ')
        return c.ifEmpty { "guide.gpx" }
    }

    fun mime(name: String): String = when (PathResolver.extension(name)) {
        "kml" -> "application/vnd.google-earth.kml+xml"
        "gpx" -> "application/gpx+xml"
        else -> "application/octet-stream"
    }
}

/** Page-to-native bridge messages (one JSON object per message). */
sealed interface BridgeMessage {
    data class Api(val id: Int, val method: String, val path: String, val headers: Map<String, String>, val body: String?) : BridgeMessage
    data object BootOk : BridgeMessage
    data class OpenMap(val guide: String?, val points: List<CragPoint>) : BridgeMessage
    data class ContentsAvailable(val available: Boolean) : BridgeMessage
    data class OpenContents(val entries: List<ContentsEntry>) : BridgeMessage
    data class ShareFile(val name: String, val mime: String?, val text: String) : BridgeMessage
    data class OpenExternal(val url: String) : BridgeMessage

    companion object {
        fun parse(raw: String): BridgeMessage? {
            val o = try { Json.parseToJsonElement(raw).jsonObject } catch (e: Exception) { return null }
            fun str(k: String) = o[k]?.let { (it as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull }
            return when (str("type")) {
                "bootOK" -> BootOk
                "api" -> {
                    val id = str("id")?.toIntOrNull() ?: return null
                    val path = str("path") ?: return null
                    if (!path.startsWith("/g/api/")) return null
                    val headers = (o["headers"] as? kotlinx.serialization.json.JsonObject)?.mapNotNull { (k, v) -> (v as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull?.let { k to it } }?.toMap() ?: emptyMap()
                    Api(id, (str("method") ?: "GET").uppercase(), path, headers, str("body"))
                }
                "openMap" -> {
                    val guide = str("guide")
                    val pts = (o["points"] as? kotlinx.serialization.json.JsonArray)?.mapIndexedNotNull { i, e ->
                        val d = e as? kotlinx.serialization.json.JsonObject ?: return@mapIndexedNotNull null
                        val lat = (d["lat"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
                        val lon = (d["lon"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
                        if (lat == null || lon == null || guide == null) null
                        else CragPoint("page-$guide-$i", guide, (d["title"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: "", "", lat, lon)
                    } ?: emptyList()
                    OpenMap(guide, pts)
                }
                "contentsAvailable" -> ContentsAvailable(str("available") == "true")
                "openContents" -> {
                    val entries = (o["entries"] as? kotlinx.serialization.json.JsonArray)?.mapNotNull { e ->
                        val d = e as? kotlinx.serialization.json.JsonObject ?: return@mapNotNull null
                        fun s(k: String) = (d[k] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
                        val a = s("anchor") ?: return@mapNotNull null
                        val t = s("text") ?: return@mapNotNull null
                        ContentsEntry(a, s("kind") ?: "heading", s("level")?.toIntOrNull() ?: 0, t, s("number"), s("grade"), s("stars"))
                    } ?: emptyList()
                    OpenContents(entries)
                }
                "shareFile" -> ShareFile(str("name") ?: return null, str("mime"), str("text") ?: return null)
                "openExternal" -> OpenExternal(str("url") ?: return null)
                else -> null
            }
        }
    }
}
