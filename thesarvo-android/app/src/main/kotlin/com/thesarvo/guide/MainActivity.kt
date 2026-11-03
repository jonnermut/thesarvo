package com.thesarvo.guide

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.thesarvo.guide.ui.Chrome
import com.thesarvo.guide.ui.Root
import com.thesarvo.guide.ui.ThesarvoTheme
import androidx.compose.ui.graphics.toArgb

class MainActivity : ComponentActivity() {
    private lateinit var model: AppModel
    private var chooser: ValueCallback<Array<Uri>>? = null

    private val pickImages = registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { finishChooser(it.toTypedArray()) }
    private val pickImage = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { finishChooser(listOfNotNull(it).toTypedArray()) }
    private val pickFiles = registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { finishChooser(it.toTypedArray()) }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    private fun finishChooser(uris: Array<Uri>) {
        chooser?.onReceiveValue(if (uris.isEmpty()) null else uris)
        chooser = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(Chrome.bar.toArgb()), navigationBarStyle = SystemBarStyle.dark(Chrome.bar.toArgb()))
        super.onCreate(savedInstanceState)
        model = (application as ThesarvoApp).model
        model.web.attach(this)
        model.web.onFileChooser = { params, callback -> openChooser(params, callback) }
        setContent { ThesarvoTheme { Root(model) { askForNotifications() } } }
        model.start()
        handleIntent(intent, first = true)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent, first = false)
    }

    private fun handleIntent(intent: Intent, first: Boolean) {
        val data = intent.data
        if (intent.action == Intent.ACTION_VIEW && data != null && data.host?.endsWith("thesarvo.com") == true && (data.path ?: "").startsWith("/g")) {
            model.selectTab(AppTab.Guides)
            model.web.open((data.encodedPath ?: "/g/") + (data.encodedQuery?.let { "?$it" } ?: ""))
        }
        if (BuildConfig.DEBUG) model.applyDebugExtras(intent.extras)
    }

    private fun openChooser(params: WebChromeClient.FileChooserParams, callback: ValueCallback<Array<Uri>>): Boolean {
        chooser?.onReceiveValue(null)
        chooser = callback
        val types = params.acceptTypes.filter { it.isNotBlank() }
        val images = types.isEmpty() || types.all { it.startsWith("image") }
        try {
            when {
                images && params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE -> pickImages.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                images -> pickImage.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                else -> pickFiles.launch(types.firstOrNull() ?: "*/*")
            }
        } catch (e: Exception) { chooser = null; return false }
        return true
    }

    private fun askForNotifications() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    override fun onStart() { super.onStart(); model.onStart() }

    override fun onStop() { model.onStop(); super.onStop() }

    override fun onDestroy() {
        // A replaced instance (after an app update, or a task restored beside a new one) is destroyed after its successor attached: leave the shared web view alone then.
        if (model.web.isAttachedTo(this)) {
            model.web.detach()
            (model.web.webView.parent as? android.view.ViewGroup)?.removeView(model.web.webView)
            model.web.onFileChooser = null
        }
        super.onDestroy()
    }
}
