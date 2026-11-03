package com.thesarvo.guide.web

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import android.content.MutableContextWrapper
import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.ScriptHandler
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.thesarvo.core.BridgeMessage
import com.thesarvo.core.Tokens
import com.thesarvo.guide.AppConfig
import com.thesarvo.guide.BuildConfig
import kotlinx.serialization.json.Json
import org.json.JSONObject

/** The one long-lived `WebView` that shows the site's pages from the local store, and the bridge between the page and the app. */
class WebModel(private val app: Application, private val site: SiteClient) {
    private val context = MutableContextWrapper(app)

    var title by mutableStateOf("")
        private set
    var path by mutableStateOf("/g/")
        private set
    var canGoBack by mutableStateOf(false)
        private set
    var isLoading by mutableStateOf(false)
        private set
    /** Bumped when the web view's render process died and a new view was made, so the screen can say so. */
    var recoveries by mutableStateOf(0)
        private set

    var onMessage: ((BridgeMessage) -> Unit)? = null
    var onNavigated: ((String) -> Unit)? = null
    var presentExternal: ((Uri) -> Unit)? = null
    var onFileChooser: ((WebChromeClient.FileChooserParams, ValueCallback<Array<Uri>>) -> Boolean)? = null

    private var authSource = ""
    private var textSource = ""
    private var handlers = emptyList<ScriptHandler>()
    private val json = Json { ignoreUnknownKeys = true }

    var webView: WebView by mutableStateOf(build()); private set

    /** Attaches an activity so dialogs and pickers the page opens have a window (and drops it again with [detach]). */
    fun attach(activity: Context) { context.baseContext = activity }
    fun detach() { context.baseContext = app }
    fun isAttachedTo(activity: Context) = context.baseContext === activity

    val supported: Boolean
        get() = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)

    @SuppressLint("SetJavaScriptEnabled")
    private fun build(): WebView {
        val w = WebView(context)
        w.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(false)
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            safeBrowsingEnabled = true
        }
        // The site decides its own colours: no forced or algorithmic darkening of its pages.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) WebSettingsCompat.setAlgorithmicDarkeningAllowed(w.settings, false)
        w.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        w.overScrollMode = View.OVER_SCROLL_NEVER
        w.webViewClient = Client()
        w.webChromeClient = Chrome()
        w.setDownloadListener { url, _, _, _, _ -> if (url.startsWith("http")) presentExternal?.invoke(Uri.parse(url)) }
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
        if (supported) {
            WebViewCompat.addWebMessageListener(w, "thesarvoHost", setOf(AppConfig.ORIGIN)) { _, message: WebMessageCompat, _, isMainFrame, _: JavaScriptReplyProxy ->
                if (isMainFrame) message.data?.let { BridgeMessage.parse(it) }?.let { onMessage?.invoke(it) }
            }
            installScripts(w)
        }
        return w
    }

    private fun installScripts(w: WebView = webView) {
        if (!supported) return
        handlers.forEach { it.remove() }
        handlers = listOf(APP_MODE_SCRIPT, textSource, authSource).filter { it.isNotEmpty() }.map { WebViewCompat.addDocumentStartJavaScript(w, it, setOf(AppConfig.ORIGIN)) }
    }

    fun open(path: String) { webView.loadUrl(AppConfig.ORIGIN + path) }

    /** A load, not `WebView.reload()`: a document that was a 404 (the store was empty) is not fetched again by a reload. */
    fun reload() { webView.loadUrl(webView.url?.takeIf { it.startsWith(AppConfig.ORIGIN) } ?: (AppConfig.ORIGIN + "/g")) }

    fun goBack() { webView.goBack() }

    /** Gives the page the signed-in tokens in the place the website's own session code keeps them (or removes them), now and on every load. */
    fun setAuth(tokens: Tokens?) {
        val js = if (tokens != null) "try { localStorage.setItem('thesarvo.auth', ${JSONObject.quote(json.encodeToString(Tokens.serializer(), tokens))}); } catch (e) {}" else "try { localStorage.removeItem('thesarvo.auth'); } catch (e) {}"
        authSource = js
        installScripts()
        webView.evaluateJavascript("$js window.dispatchEvent(new StorageEvent('storage', { key: 'thesarvo.auth' }));", null)
    }

    /** The tokens the page holds now (it refreshes them itself), to keep the vault current. */
    fun pageTokens(onResult: (Tokens?) -> Unit) {
        webView.evaluateJavascript("localStorage.getItem('thesarvo.auth')") { raw ->
            val s = try { json.parseToJsonElement(raw ?: "null").let { (it as? kotlinx.serialization.json.JsonPrimitive)?.takeIf { p -> p.isString }?.content } } catch (e: Exception) { null }
            onResult(s?.let { runCatching { json.decodeFromString(Tokens.serializer(), it) }.getOrNull() })
        }
    }

    /** Scales the page with CSS `zoom` on the root, which reflows the layout to the screen width (the site sizes most text in px). */
    fun setTextScale(scale: Float) {
        val js = "if (document.documentElement) document.documentElement.style.zoom = '$scale';"
        textSource = if (scale == 1f) "" else js
        installScripts()
        webView.evaluateJavascript(if (scale == 1f) "document.documentElement.style.zoom = '';" else js, null)
    }

    fun requestMapPoints() { webView.evaluateJavascript("window.thesarvoMapPoints && window.thesarvoMapPoints();", null) }

    fun requestContents() { webView.evaluateJavascript("window.thesarvoContents && window.thesarvoContents();", null) }

    /** Scrolls the page to an element (a Contents entry chosen in the native sheet). */
    fun scrollTo(anchor: String) {
        webView.evaluateJavascript("(function(a){ var e = document.getElementById(a); if (e) { e.scrollIntoView({ block: 'start' }); history.replaceState(null, '', '#' + a); } })(${JSONObject.quote(anchor)});", null)
    }

    /** Delivers an answer to `window.thesarvoBridge.reply`. */
    fun reply(id: Int, status: Int, body: String) {
        webView.evaluateJavascript("window.thesarvoBridge && window.thesarvoBridge.reply($id, $status, ${JSONObject.quote(body)});", null)
    }

    /** A new view after the render process died or was killed (the old one cannot be used again). */
    private fun recover() {
        val last = path
        runCatching { (webView.parent as? android.view.ViewGroup)?.removeView(webView); webView.destroy() }
        handlers = emptyList()
        webView = build()
        recoveries++
        webView.loadUrl(AppConfig.ORIGIN + last)
    }

    fun destroy() { runCatching { webView.destroy() } }

    private inner class Client : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
            if (request.url.host == AppConfig.ORIGIN_HOST && request.url.scheme == "https") site.handle(request) else null

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            if (url.host == AppConfig.ORIGIN_HOST) return false
            if (url.scheme == "about") return false
            val host = url.host ?: ""
            if ((host == "thesarvo.com" || host.endsWith(".thesarvo.com")) && (url.path ?: "").startsWith("/g")) {
                open((url.encodedPath ?: "/g/") + (url.encodedQuery?.let { "?$it" } ?: ""))
                return true
            }
            if (url.scheme in listOf("http", "https", "mailto", "tel", "geo")) presentExternal?.invoke(url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) { isLoading = true }

        override fun onPageFinished(view: WebView, url: String?) { isLoading = false }

        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            canGoBack = view.canGoBack()
            val u = url?.let { Uri.parse(it) } ?: return
            if (u.host != AppConfig.ORIGIN_HOST) return
            val p = (u.encodedPath ?: "/") + (u.encodedQuery?.let { "?$it" } ?: "")
            path = p
            onNavigated?.invoke(p)
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            if (view === webView) recover()
            return true
        }
    }

    private inner class Chrome : WebChromeClient() {
        override fun onReceivedTitle(view: WebView, t: String?) { title = t ?: "" }

        override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback) { callback.invoke(origin, false, false) }

        override fun onShowFileChooser(webView: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
            val handler = onFileChooser
            if (handler == null || !handler(params, callback)) { callback.onReceiveValue(null) }
            return true
        }

        /** `window.open` and `target=_blank`: the first address loaded in the throwaway view opens outside the app. */
        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
            val temp = WebView(view.context)
            temp.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean { presentExternal?.invoke(request.url); v.destroy(); return true }
                override fun onPageStarted(v: WebView, url: String?, favicon: Bitmap?) { url?.let { presentExternal?.invoke(Uri.parse(it)) }; v.stopLoading(); v.destroy() }
            }
            (resultMsg.obj as WebView.WebViewTransport).webView = temp
            resultMsg.sendToTarget()
            return true
        }
    }

    companion object {
        /** Tells the page it runs in the app before it starts; the site's own stylesheet hides its header, side tree and footer for `data-app`. */
        val APP_MODE_SCRIPT = """
            (function () {
              window.thesarvoApp = { bridge: ${AppConfig.BRIDGE_VERSION}, platform: 'android' };
              document.documentElement.setAttribute('data-app', 'android');
              window.addEventListener('load', function () { try { thesarvoHost.postMessage(JSON.stringify({ type: 'bootOK' })); } catch (e) {} });
            })();
        """.trimIndent()
    }
}
