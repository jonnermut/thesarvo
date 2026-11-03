package com.thesarvo.guide.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.FileProvider
import com.thesarvo.core.SharedFileName
import java.io.File

/** Opens a web address in a Custom Tab; other schemes (mailto, tel, geo) go to whatever app handles them. */
fun Context.openExternal(uri: Uri) {
    try {
        if (uri.scheme == "http" || uri.scheme == "https") CustomTabsIntent.Builder().build().launchUrl(this, uri)
        else startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: ActivityNotFoundException) { /* nothing can open it */ }
}

fun Context.shareText(text: String) {
    startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

/** Shares a generated file (GPX, KML) through the system share sheet, from the app's `cache/shared/` via the FileProvider. */
fun Context.shareFile(name: String, mime: String?, text: String) {
    val dir = File(cacheDir, "shared").also { it.mkdirs() }
    dir.listFiles()?.forEach { it.delete() }
    val file = File(dir, SharedFileName.clean(name)).also { it.writeText(text) }
    val uri = FileProvider.getUriForFile(this, "$packageName.files", file)
    val send = Intent(Intent.ACTION_SEND).setType(mime ?: SharedFileName.mime(name)).putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    startActivity(Intent.createChooser(send, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
