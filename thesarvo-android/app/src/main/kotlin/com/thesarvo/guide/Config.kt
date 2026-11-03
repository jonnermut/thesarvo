package com.thesarvo.guide

import android.content.Context
import android.content.SharedPreferences
import com.thesarvo.core.Policy
import com.thesarvo.core.Selection

object AppConfig {
    const val ORIGIN_HOST = "app.thesarvo.invalid"
    const val ORIGIN = "https://$ORIGIN_HOST"
    const val BRIDGE_VERSION = 1
    const val SHELL_VERSION = 1
    const val DEFAULT_BASE = "https://thesarvo.com"
    const val SITE = "https://thesarvo.com"
}

enum class DownloadMode(val key: String, val title: String) {
    Thumbnails("thumbnails", "Small pictures only"),
    AllPhotos("allPhotos", "All photos"),
    FullQuality("fullQuality", "All photos, full quality");

    val policy: Policy
        get() = when (this) {
            Thumbnails -> Policy.thumbnails
            AllPhotos -> Policy(Selection.All, Selection.All, Selection.None)
            FullQuality -> Policy.fullQuality
        }

    companion object {
        fun of(key: String?) = entries.firstOrNull { it.key == key } ?: Thumbnails
    }
}

/** The small settings the app keeps (the same keys as the iOS app's UserDefaults). */
class Prefs(context: Context) {
    val sp: SharedPreferences = context.getSharedPreferences("thesarvo", Context.MODE_PRIVATE)

    var downloadMode: DownloadMode
        get() = DownloadMode.of(sp.getString("downloadMode", null))
        set(v) = sp.edit().putString("downloadMode", v.key).apply()
    var cellularImages: Boolean
        get() = sp.getBoolean("cellularImages", false)
        set(v) = sp.edit().putBoolean("cellularImages", v).apply()
    var firstRunDone: Boolean
        get() = sp.getBoolean("firstRunDone", false)
        set(v) = sp.edit().putBoolean("firstRunDone", v).apply()
    var textScale: Float
        get() = sp.getFloat("textScale", 1f).takeIf { it > 0 } ?: 1f
        set(v) = sp.edit().putFloat("textScale", v).apply()
    var showClimbsInMenu: Boolean
        get() = sp.getBoolean("showClimbsInTOC", false)
        set(v) = sp.edit().putBoolean("showClimbsInTOC", v).apply()
    var lastPath: String
        get() = sp.getString("lastPath", null) ?: "/g/"
        set(v) = sp.edit().putString("lastPath", v).apply()
    var recents: List<String>
        get() = sp.getString("recentGuides", "")!!.split(',').filter { it.isNotEmpty() }
        set(v) = sp.edit().putString("recentGuides", v.joinToString(",")).apply()
    var syncBase: String?
        get() = sp.getString("syncBase", null)?.takeIf { it.startsWith("http") }
        set(v) = sp.edit().putString("syncBase", v).apply()
    var apiBase: String?
        get() = sp.getString("apiBase", null)?.takeIf { it.startsWith("http") }
        set(v) = sp.edit().putString("apiBase", v).apply()
    var clientId: String?
        get() = sp.getString("cognitoClientId", null)?.takeIf { it.isNotEmpty() }
        set(v) = sp.edit().putString("cognitoClientId", v).apply()
    var migrated: Boolean
        get() = sp.getBoolean("migratedTo3", false)
        set(v) = sp.edit().putBoolean("migratedTo3", v).apply()
    var photoCursorDone: Boolean
        get() = sp.getBoolean("photoSliceDone", true)
        set(v) = sp.edit().putBoolean("photoSliceDone", v).apply()

    val baseUrl: String get() = (syncBase ?: AppConfig.DEFAULT_BASE).trimEnd('/')
    val apiUrl: String get() = (apiBase ?: AppConfig.DEFAULT_BASE).trimEnd('/')
}
