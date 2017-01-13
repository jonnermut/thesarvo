package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.util.Log;

import com.google.common.base.Strings;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

/**
 * Created by jon on 28/12/2016.
 */
class SearchIndexTask implements Runnable
{
    final String WWW_PATH = "www/data/";
    private GuideApplication guideApplication;
    private ResourceManager resourceManager;
    int key = 1;
    String viewId = null;

    private static Map<String, IndexEntry> index = new HashMap<>();
    Map<String, ViewModel.ViewDef> views = ViewModel.get().getViews();
    Map<String, ViewModel.ListItem> guideListItems = ViewModel.get().getGuideListItems();

    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

    public static Map<String, IndexEntry> getIndex()
    {
        return index;
    }

    public SearchIndexTask(GuideApplication guideApplication, ResourceManager resourceManager, String viewId)
    {
        this.guideApplication = guideApplication;
        this.resourceManager = resourceManager;
        this.viewId = viewId;
    }

    @Override
    public void run()
    {
        //delete the old database first
        //guideApplication.getBaseContext().deleteDatabase(IndexContentProvider.DBNAME);

        //find all XML files
        //String[] allFiles;
        //AssetManager manager = guideApplication.getAssets();



        try
        {

            if (viewId == null)
            {

                //load all XML files
                for ( String vid : guideListItems.keySet() )
                {
                    this.viewId = vid;
                    indexGuideXml(viewId);

                }
            }
            else
            {
                indexGuideXml(viewId);
            }

        }
        catch (Throwable e)
        {
            e.printStackTrace();

        }

        Log.d("Search Index", "Indexing complete!");

    }

    private void indexGuideXml( String viewId) throws SAXException, IOException
    {
        try
        {
            DocumentBuilder builder = factory.newDocumentBuilder();

            ViewModel.ListItem item = guideListItems.get(viewId);

            String guideId = viewId.substring(6);

            InputStream stream = resourceManager.getDataAsset(guideId + ".xml");

            Uri.Builder urib = new Uri.Builder();
            urib.scheme(ContentResolver.SCHEME_CONTENT);
            urib.authority(IndexContentProvider.AUTHORITY);
            urib.path(IndexContentProvider.VIEW_PSEUDOTABLE + "/" + viewId);
            Uri uri = urib.build();
            guideApplication.getContentResolver().delete(uri, null, null);

            indexListItem(viewId, item);

            // added to straighten out UTF-8 errors
            Reader reader = new InputStreamReader(stream, "UTF-8");
            InputSource source = new InputSource(reader);

            Document dom = builder.parse(source);
            Element root = dom.getDocumentElement();
            //if there's no guide data continue
            if (!root.getTagName().equals("guide"))
            {
                Log.d("Search Index", guideId + " not a guide");
                return;
            }

            for (Element e : Xml.getElements(dom.getElementsByTagName("climb")))
            {
                indexClimbElement(viewId, item, e);
            }

            //do the same for boulder problems because teh Krauss
            for (Element e : Xml.getElements(dom.getElementsByTagName("problem")))
            {
                indexClimbElement(viewId, item, e);
            }

            for (Element e : Xml.getElements(dom.getElementsByTagName("text")))
            {
                indexTextElement(viewId, item, e);
            }


            indexGPSElements(dom);
        }
        catch (Throwable t)
        {
            t.printStackTrace();
            Log.e("SearchIndexTask", "Unexpected error indexing " + viewId, t);
        }

    }

    private void indexListItem(String viewId, ViewModel.ListItem item)
    {
        //make index entry for view it's self
        IndexEntry entry = new IndexEntry();
        entry.viewId = viewId;
        entry.text = item.getText();
        entry.key = ++key;
        entry.type = IndexEntry.IndexType.VIEW;

        index.put(entry.text, entry);
        addEntry(entry);
        //Log.d("Indexing", "adding " + entry.text);
    }

    private void indexGPSElements(Document dom)
    {
        List<GPSNode> gpsNodes = MapsFragment.getGPSPoints();

        for (Element e : Xml.getElements(dom.getElementsByTagName("gps")))
        {
            String id = e.getAttribute("id");
            List<Point> points = new ArrayList<>();

            for (Element ePoint : Xml.getElements(e.getElementsByTagName("point")))
            {
                Point point = new Point(ePoint);
                points.add(point);

            }


            //Log.d("Indexing", "adding gps node for " + item.getText());
            GPSNode gpsnode = new GPSNode(id, points);
            gpsNodes.add(gpsnode);

            addGPSEntry(gpsnode);


            //don't think an entry for the GPS is needed, not sure that that code is doing

        }
    }

    private void indexTextElement(String viewId, ViewModel.ListItem item, Element e)
    {
        if (e.getAttribute("class").startsWith("h"))
        {
            IndexEntry entry1 = new IndexEntry();
            entry1.viewId = viewId;
            entry1.viewName = item.getText();
            entry1.elementID = e.getAttribute("id");

            String text = e.getTextContent().trim();
            entry1.text = text;

            entry1.type = IndexEntry.IndexType.HEADING;
            entry1.key = ++key;

            //Log.d("Indexing", "adding heading " + text);
            index.put(text, entry1);
            addEntry(entry1);
        }
    }

    private void indexClimbElement(String viewId, ViewModel.ListItem item, Element e)
    {
        IndexEntry entry1 = new IndexEntry();
        entry1.viewId = viewId;
        entry1.viewName = item.getText();
        entry1.elementID = e.getAttribute("id");

        String stars = e.getAttribute("stars");
        String grade = e.getAttribute("grade");
        String name = e.getAttribute("name");

        if (!Strings.isNullOrEmpty(name) || !Strings.isNullOrEmpty(grade))
        {
            String text = String.format("%s %s %s", stars, grade, name);
            text = text.trim();
            entry1.text = text;

            entry1.type = IndexEntry.IndexType.CLIMB;
            entry1.key = ++key;


            index.put(text, entry1);
            addEntry(entry1);
        }
    }

    /**
     * helper to add an entry to the main table and the suggestions table
     */
    public void addEntry(IndexEntry entry)
    {
        Log.d("Indexing", "adding entry " + entry.text);

        //add normal entry and suggestions entry
        ContentValues values = new ContentValues();
        //values.put(IndexContentProvider.COL_ID, entry.key);
        values.put(IndexContentProvider.COL_TEXT, entry.text);
        values.put(IndexContentProvider.COL_ELEMENT_ID, entry.elementID);
        values.put(IndexContentProvider.COL_TYPE, entry.type.ordinal());
        values.put(IndexContentProvider.COL_VIEW_ID, entry.viewId);
        values.put(IndexContentProvider.COL_VIEW_NAME, entry.viewName);

        //add this one and then use the return to add the next
        Uri.Builder builder = new Uri.Builder();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.MAIN_TABLE);
        Uri uri = builder.build();

        Uri normalUri = guideApplication.getContentResolver().insert(uri, values);

        //create the suggestion entry
        ContentValues suggestionValues = new ContentValues();
        suggestionValues.put(SearchManager.SUGGEST_COLUMN_TEXT_1, entry.text);
        suggestionValues.put(SearchManager.SUGGEST_COLUMN_TEXT_2, entry.viewName);
        suggestionValues.put(SearchManager.SUGGEST_COLUMN_INTENT_DATA_ID, normalUri.getLastPathSegment());

        builder.clearQuery();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.SUGESTIONS_TABLE);
        uri = builder.build();

        guideApplication.getContentResolver().insert(uri, suggestionValues);
    }

    public void addGPSEntry(GPSNode node)
    {
        for (Point p : node.getPoints())
        {
            ContentValues values = new ContentValues();
            values.put(IndexContentProvider.COL_GPS_ID, node.getId());
            values.put(IndexContentProvider.COL_LAT, p.getLatLng().latitude);
            values.put(IndexContentProvider.COL_LNG, p.getLatLng().longitude);
            values.put(IndexContentProvider.COL_DESC, p.getDescription());
            values.put(IndexContentProvider.COL_CODE, p.getCode());

            Uri.Builder builder = new Uri.Builder();
            builder.authority(IndexContentProvider.AUTHORITY);
            builder.scheme(ContentResolver.SCHEME_CONTENT);
            builder.path(IndexContentProvider.MAP_TABLE);

            guideApplication.getContentResolver().insert(builder.build(), values);
        }
    }

    /*
    @Override
    protected void onProgressUpdate(Integer... progress)
    {

    }

    @Override
    protected void onPostExecute(Long result)
    {
        guideApplication.indexed = true;
        guideApplication.mapsIndexed = true;
        guideApplication.searchIndexed();
    }

    */

}
