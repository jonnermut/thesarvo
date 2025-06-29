package com.thesarvo.guide

import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import com.fasterxml.jackson.databind.ObjectMapper
import java.io.UnsupportedEncodingException
import java.math.BigInteger
import java.net.URI
import java.net.URISyntaxException
import java.util.Locale

/**
 * A fragment representing a single Guide detail screen.
 * This fragment is either contained in a [GuideListActivity]
 * in two-pane mode (on tablets) or a [GuideDetailActivity]
 * on handsets.
 */
/**
 * Mandatory empty constructor for the fragment manager to instantiate the
 * fragment (e.g. upon screen orientation changes).
 */
class GuideDetailFragment : androidx.fragment.app.Fragment()
{


    /**
     * The dummy content this fragment is presenting.
     */
    private var viewId: String? = null
    private var singleNodeData: String? = null
    private var js: JSInterface? = null
    private var elementId: String? = null
    var guide: Guide? = null

    var setupDone = false

    override fun onCreate(savedInstanceState: Bundle?)
    {
        super.onCreate(savedInstanceState)

        val args = arguments ?: return

        if (args.containsKey(ARG_ITEM_ID))
        {
            // Load the dummy content specified by the fragment
            // arguments. In a real-world scenario, use a Loader
            // to load content from a content provider.
            val itemId = args.getString(ARG_ITEM_ID)
            //mItem = Model.get().getViews().get(itemId);
            viewId = itemId

            if (itemId != null)
                guide = Model.get().getGuide(itemId)
        }

        if (args.containsKey(ELEMENT_ID))
        {
            elementId = args.getString(ELEMENT_ID)
        }

        if (args.containsKey(SINGLE_NODE_DATA))
        {
            singleNodeData = arguments!!.getString(SINGLE_NODE_DATA)
        }
    }

    private var rootView: View? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View?
    {
        if (rootView != null)
            return rootView;

        super.onCreateView(inflater, container, savedInstanceState)

        rootView = inflater.inflate(R.layout.fragment_guide_detail, container, false)
        val webview = getWebView(rootView!!)


        setupWebView(webview)
        val viewId = this.viewId

        // Show the dummy content as text in a TextView.
        if (viewId != null)
        {
            //((TextView) rootView.findViewById(R.id.guide_detail)).setText(viewId);


            var url: String
            if (viewId.startsWith("http"))
            {
                url = viewId

            }
            else
            {
                url = "file:///android_asset/www/index.html"
                //url = GuideListActivity.getAssetPath("www.index.html");
            }

            webview.loadUrl(url)

        }

        setupDone = true
        return rootView
    }

    private fun getGuideDataJson(): String
    {
        val viewId = this.viewId
        val map = HashMap<String, Any>()

        // Show the dummy content as text in a TextView.
        if (viewId != null)
        {
            var guideData: String?

            if (singleNodeData != null)
                guideData = singleNodeData
            else
                guideData = getGuideData()

            if (guideData != null)
            {

                if (guideData.indexOf("<guide") < 0)
                    guideData = "<guide>$guideData</guide>"

                map["guide_pageid"] = getGuideId(viewId)
                map["guide_xml"] = guideData

                if (singleNodeData != null)
                {
                    map["guide_callOut"] = true

                }

                if (elementId != null)
                {
                    map["guide_showId"] = elementId as Any

                }
            }
        }
        val om = ObjectMapper()
        val ret = om.writeValueAsString(map)
        return ret
    }

    private fun setupWebView(webview: WebView)
    {
        webview.setInitialScale(0)
        webview.isVerticalScrollBarEnabled = false

        // Enable JavaScript
        val settings = webview.settings
        settings.javaScriptEnabled = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.layoutAlgorithm = WebSettings.LayoutAlgorithm.NORMAL
        settings.allowFileAccessFromFileURLs = true


        WebView.setWebContentsDebuggingEnabled(true)

        webview.webViewClient = WVClient()
        webview.webChromeClient = MyWebChromeClient()


        // FIXME
        val js = JSInterface()
        this.js = js
        webview.addJavascriptInterface(js, "thesarvoApp") // TODO
    }

    private fun getWebView(rootView: View): WebView
    {
        return rootView.findViewById<View>(R.id.guide_detail) as WebView
    }

    public inner class JSInterface
    {
        @JavascriptInterface
        public fun hello(): String
        {
            return getGuideDataJson()
        }

    }

    fun convertToCachedFilename(url: String): String
    {
        var path = url
        if (path.lastIndexOf('/') > 0)
            path = path.substring(path.lastIndexOf('/'))
        if (path.lastIndexOf('?') >= 0)
            path = path.substring(0, path.lastIndexOf('?') - 1)

        var ext = ".xml"
        val idx = path.lastIndexOf(".")
        if (idx > -1)
        {
            ext = path.substring(idx)
        }



        return "" + fnv1a_64(url) + ext.lowercase(Locale.getDefault())
    }

    fun fnv1a_64(data: String): BigInteger
    {
        try
        {
            return fnv1a_64(data.toByteArray(charset("UTF-8")))
        }
        catch (e: UnsupportedEncodingException)
        {

            e.printStackTrace()
            return BigInteger.ZERO
        }

    }

    fun fnv1a_64(data: ByteArray): BigInteger
    {
        var hash = INIT64

        for (b in data)
        {
            hash = hash.xor(BigInteger.valueOf((b.toInt() and 0xff).toLong()))
            hash = hash.multiply(PRIME64).mod(MOD64)
        }

        return hash
    }


    fun getGuideData(): String?
    {
        return this.guide?.data
    }

    private fun getGuideId(guideId: String): String
    {
        var id = guideId
        if (id.startsWith("guide."))
            id = id.substring(6)
        return id
    }

    inner class MyWebChromeClient: android.webkit.WebChromeClient()
    {
        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean
        {
            consoleMessage?.message()?.let { Log.i("thesavo", it) }
            return super.onConsoleMessage(consoleMessage)
        }

    }


    inner class WVClient : WebViewClient()
    {
        internal var map = MimeTypeMap.getSingleton()

        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean
        {
            Log.d("thesarvo", "shouldOverrideUrlLoading: $url")
            if (url.startsWith("ts"))
            {
                var uri: URI? = null
                try
                {
                    uri = URI(url)

                    val command = uri.host
                    var data = uri.path
                    if (data.startsWith("/"))
                        data = data.substring(1)

                    //problem with this is it's calling on a main activity with a changed state,
                    //should use some sort of callback instead
                    if ("openImage" == command)
                    {
                        Log.d("thesarvo", "openImage")
                        MainActivity.get()!!.showGuideDetail(this@GuideDetailFragment.viewId, data, true, null)
                    }
                    else if ("map" == command)
                    {
                        //map needs to open here as well
                        Log.d("thesarvo", "map")
                        MainActivity.get()!!.showMap(data, viewId)

                    }
                }
                catch (e: URISyntaxException)
                {
                    e.printStackTrace()
                }



                return true
            }


            return false
        }

        override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse?
        {
            //Log.d("Intercept response", url);
            if (Uri.parse(url).host != null)
            {
                if (Uri.parse(url).host == Uri.parse("file:///android_asset/...").host)
                {
                    var path = Uri.parse(url).path
                    path = path!!.substring("/android_asset/".length)
                    //Log.d("Intercept response", path);

                    val stream = GuideApplication.get().resourceManager.getWWWAsset(path)
                    val mime = map.getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(url))

                    return WebResourceResponse(mime, "UTF-8", stream)
                }
            }

            return super.shouldInterceptRequest(view, url)
        }
    }

    companion object
    {
        /**
         * The fragment argument representing the item ID that this fragment
         * represents.
         */
        val ARG_ITEM_ID = "item_id"
        val ELEMENT_ID = "elementId"
        val SINGLE_NODE_DATA = "singleNodeData"

        private val INIT64 = BigInteger("cbf29ce484222325", 16)
        private val PRIME64 = BigInteger("100000001b3", 16)
        private val MOD64 = BigInteger("2").pow(64)
    }
}
