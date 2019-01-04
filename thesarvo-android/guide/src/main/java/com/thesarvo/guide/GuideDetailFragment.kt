package com.thesarvo.guide

import android.annotation.TargetApi
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import androidx.fragment.app.Fragment
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.Toast
import com.fasterxml.jackson.databind.ObjectMapper

import com.google.common.base.Charsets

import org.apache.commons.io.IOUtils

import java.io.IOException
import java.io.InputStream
import java.io.UnsupportedEncodingException
import java.math.BigInteger
import java.net.URI
import java.net.URISyntaxException

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

    override fun onCreate(savedInstanceState: Bundle?)
    {
        super.onCreate(savedInstanceState)

        if (arguments!!.containsKey(ARG_ITEM_ID))
        {
            // Load the dummy content specified by the fragment
            // arguments. In a real-world scenario, use a Loader
            // to load content from a content provider.
            val itemId = arguments!!.getString(ARG_ITEM_ID)
            //mItem = Model.get().getViews().get(itemId);
            viewId = itemId

            guide = Model.get().getGuide(itemId)
        }

        if (arguments!!.containsKey(ELEMENT_ID))
        {
            elementId = arguments!!.getString(ELEMENT_ID)
        }

        if (arguments!!.containsKey(SINGLE_NODE_DATA))
        {
            singleNodeData = arguments!!.getString(SINGLE_NODE_DATA)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View?
    {


        val rootView = inflater.inflate(R.layout.fragment_guide_detail, container, false)
        val webview = getWebView(rootView)
        setupWebView(webview)
        val viewId = this.viewId

        // Show the dummy content as text in a TextView.
        if (viewId != null)
        {
            //((TextView) rootView.findViewById(R.id.guide_detail)).setText(viewId);


            var url = ""
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

                //guideData = guideData.replace("\n", "\\n")
                //guideData = guideData.replace("\r", "\\r")
                //guideData = guideData.replace("'", "\\'")

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

        //if (android.os.Build.VERSION.SDK_INT > android.os.Build.VERSION_CODES.ICE_CREAM_SANDWICH_MR1)
        //    Level16Apis.enableUniversalAccess(settings)


        WebView.setWebContentsDebuggingEnabled(true)

        webview.webViewClient = WVClient()

        webview.webChromeClient = MyWebChromeClient()


        // FIXME
        js = JSInterface()
        webview.addJavascriptInterface(js, "thesarvoApp") // TODO
    }

    /*
    // Wrapping these functions in their own class prevents warnings in adb like:
    // VFY: unable to resolve virtual method 285: Landroid/webkit/WebSettings;.setAllowUniversalAccessFromFileURLs
    @TargetApi(16)
    private object Level16Apis
    {
        internal fun enableUniversalAccess(settings: WebSettings)
        {
            settings.allowUniversalAccessFromFileURLs = true
        }
    }
    */

    /*
    @TargetApi(19)
    private object Level19Apis
    {
        internal fun setWebContentsDebuggingEnabled(webview: WebView)
        {
            try
            {
                webview.setWebContentsDebuggingEnabled(true)
            }
            catch (t: Throwable)
            {
                t.printStackTrace()
            }

        }
    }
    */


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
        val ret = url


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



        return "" + fnv1a_64(url) + ext.toLowerCase()
    }

    fun fnv1a_64(data: String): BigInteger
    {
        try
        {
            return fnv1a_64(data.toByteArray(charset("UTF-8")))
        }
        catch (e: UnsupportedEncodingException)
        {
            // TODO Auto-generated catch block
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
            Log.i("thesavo", consoleMessage?.message())
            return super.onConsoleMessage(consoleMessage)
        }

    }


    inner class WVClient : WebViewClient()
    {
        internal var map = MimeTypeMap.getSingleton()

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?)
        {
            super.onPageStarted(view, url, favicon)
        }

        override fun onPageFinished(view: WebView?, url: String?)
        {
            super.onPageFinished(view, url)

        }

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
                        MainActivity.get()!!.showMap(data)

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

                    val stream = GuideApplication.get()!!.resourceManager.getWWWAsset(path)
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
