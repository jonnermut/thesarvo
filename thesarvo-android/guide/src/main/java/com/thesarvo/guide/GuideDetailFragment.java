package com.thesarvo.guide;

import android.annotation.TargetApi;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.common.base.Charsets;

import org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.math.BigInteger;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * A fragment representing a single Guide detail screen.
 * This fragment is either contained in a {@link GuideListActivity}
 * in two-pane mode (on tablets) or a {@link GuideDetailActivity}
 * on handsets.
 */
public class GuideDetailFragment extends Fragment
{
    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_ITEM_ID = "item_id";
    public static final String SINGLE_NODE_DATA = "singleNodeData";

    /**
     * The dummy content this fragment is presenting.
     */
    private String viewId = null;
    private String singleNodeData = null;
    private JSInterface js;

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public GuideDetailFragment()
    {
    }

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        if (getArguments().containsKey(ARG_ITEM_ID))
        {
            // Load the dummy content specified by the fragment
            // arguments. In a real-world scenario, use a Loader
            // to load content from a content provider.
            String itemId = getArguments().getString(ARG_ITEM_ID);
            //mItem = ViewModel.get().getViews().get(itemId);
            viewId = itemId;
        }

        if (getArguments().containsKey(SINGLE_NODE_DATA))
        {
            singleNodeData = getArguments().getString(SINGLE_NODE_DATA);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState)
    {



        View rootView = inflater.inflate(R.layout.fragment_guide_detail, container, false);
        WebView webview = getWebView(rootView);
        setupWebView(webview);

        // Show the dummy content as text in a TextView.
        if (viewId != null)
        {
            //((TextView) rootView.findViewById(R.id.guide_detail)).setText(viewId);



            String url = "";
            if (viewId.startsWith("http"))
            {
                url = viewId;

            }
            else if (viewId.startsWith("guide."))
            {
                url = "file:///android_asset/www/index.html";
            }

            webview.loadUrl(url);

            if (viewId.startsWith("guide."))
            {
                String guideData;

                if (singleNodeData != null)
                    guideData = singleNodeData;
                else
                    guideData = getGuideData(viewId);

                if (guideData != null)
                {

                    if (guideData.indexOf("<guide") < 0)
                        guideData = "<guide>" + guideData + "</guide>";

                    guideData = guideData.replace("\n", "\\n");
                    guideData = guideData.replace("\r", "\\r");
                    guideData = guideData.replace("'", "\\'");

                    StringBuilder sb = new StringBuilder();
                    sb.append("var guide_pageid='").append(getGuideId(viewId)).append("';\n");
                    sb.append("var guide_xml='").append(guideData).append("';\n");

                    if (singleNodeData != null)
                    {
                        sb.append("var guide_callOut=true;\n");

                    }


                    //sb.append("var guide_callout='").append(guideData).append("';\n");
                    String js = sb.toString();
                    //webview.evaluateJavascript(js, null);
                    webview.loadUrl("javascript:" + js);
                }
            }
        }

        return rootView;
    }

    private void setupWebView(WebView webview)
    {
        webview.setInitialScale(0);
        webview.setVerticalScrollBarEnabled(false);

        // Enable JavaScript
        WebSettings settings = webview.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        if (android.os.Build.VERSION.SDK_INT > android.os.Build.VERSION_CODES.ICE_CREAM_SANDWICH_MR1)
            Level16Apis.enableUniversalAccess(settings);

        Level19Apis.setWebContentsDebuggingEnabled(webview);

        webview.setWebViewClient(new WVClient() );

        js = new JSInterface();
        webview.addJavascriptInterface(js, "thesarvoApp"); // TODO
    }

    // Wrapping these functions in their own class prevents warnings in adb like:
    // VFY: unable to resolve virtual method 285: Landroid/webkit/WebSettings;.setAllowUniversalAccessFromFileURLs
    @TargetApi(16)
    private static class Level16Apis
    {
        static void enableUniversalAccess(WebSettings settings)
        {
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
    }

    @TargetApi(19)
    private static class Level19Apis
    {
        static void setWebContentsDebuggingEnabled(WebView webview)
        {
            try
            {
                webview.setWebContentsDebuggingEnabled(true);
            }
            catch (Throwable t)
            {
                t.printStackTrace();
            }
        }
    }


    private WebView getWebView(View rootView)
    {
        return ((WebView) rootView.findViewById(R.id.guide_detail));
    }

    public class JSInterface
    {
        @JavascriptInterface
        public String hello()
        {
            return "hello world";
        }

    }

    public String convertToCachedFilename(String url)
    {
        String ret = url;


        String path = url;
        if (path.lastIndexOf('/') > 0)
            path = path.substring(path.lastIndexOf('/'));
        if (path.lastIndexOf('?') >= 0)
            path = path.substring(0, path.lastIndexOf('?') - 1 );

        String ext = ".xml";
        int idx = path.lastIndexOf(".");
        if (idx > -1)
        {
            ext = path.substring(idx);
        }
        String enc = fnv1a_64(url) + ext.toLowerCase();



        return enc;
    }

    private static final BigInteger INIT64  = new BigInteger("cbf29ce484222325", 16);
    private static final BigInteger PRIME64 = new BigInteger("100000001b3",      16);
    private static final BigInteger MOD64   = new BigInteger("2").pow(64);

    public BigInteger fnv1a_64(String data)
    {
        try
        {
            return fnv1a_64( data.getBytes("UTF-8"));
        }
        catch (UnsupportedEncodingException e)
        {
            // TODO Auto-generated catch block
            e.printStackTrace();
            return BigInteger.ZERO;
        }
    }

    public BigInteger fnv1a_64(byte[] data)
    {
        BigInteger hash = INIT64;

        for (byte b : data)
        {
            hash = hash.xor(BigInteger.valueOf((int) b & 0xff));
            hash = hash.multiply(PRIME64).mod(MOD64);
        }

        return hash;
    }




    public String getGuideData(String guideId)
    {
        //String prefix = "file:///android_asset/www/data/http-3A-2F-2Fwww.thesarvo.com-2Fconfluence-2Fplugins-2Fservlet-2Fguide-2Fxml-2F";

        //String prefix = "www/data/http-3A-2F-2Fwww.thesarvo.com-2Fconfluence-2Fplugins-2Fservlet-2Fguide-2Fxml-2F";
        String urlPrefix = "http://www.thesarvo.com/confluence/plugins/servlet/guide/xml/";


        String id = getGuideId(guideId);

        /*
        String url = urlPrefix + id;
        String filename = convertToCachedFilename(url);

        //File file = new File("www/data/"+ filename);
        */
        String filename = id + ".xml";

        String ret = null;
        try
        {
            InputStream is = getActivity().getAssets().open("www/data/"+ filename);
            ret = IOUtils.toString(is, Charsets.UTF_8);
        }
        catch (IOException e)
        {
            e.printStackTrace();
            return null;
        }

        return ret;
    }

    private String getGuideId(String guideId)
    {
        String id = guideId;
        if (id.startsWith("guide."))
            id = id.substring(6);
        return id;
    }

    public class WVClient extends WebViewClient
    {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url)
        {
            Log.d("thesarvo", "shouldOverrideUrlLoading: " + url);
            if (url.startsWith("ts"))
            {
                URI uri = null;
                try
                {
                    uri = new URI(url);

                    String command = uri.getHost();
                    String data = uri.getPath();
                    if (data.startsWith("/"))
                        data = data.substring(1);

                    if ("openImage".equals(command))
                    {
                        Log.d("thesarvo", "openImage");
                        GuideListActivity.get().showDetail(GuideDetailFragment.this.viewId, data, true);
                    }
                    else if("map".equals(command))
                    {
                        //map needs to open here as well TODO
                    }
                }
                catch (URISyntaxException e)
                {
                    e.printStackTrace();
                }



                return true;
            }


            return false;
        }
    }

}
