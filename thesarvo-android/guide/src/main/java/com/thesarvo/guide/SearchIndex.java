package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.util.Log;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

/**
 * Created by jon on 28/12/2016.
 */
class SearchIndex extends AsyncTask<String, Integer, Long>
{
    final String WWW_PATH = "www/data/";
    private GuideListActivity guideListActivity;

    public SearchIndex(GuideListActivity guideListActivity)
    {
        this.guideListActivity = guideListActivity;
    }

    protected Long doInBackground(String... files)
    {
        //delete the old database first
        guideListActivity.getBaseContext().deleteDatabase(IndexContentProvider.DBNAME);

        //find all XML files
        String[] allFiles;
        AssetManager manager = guideListActivity.getAssets();
        Map<String, ViewModel.ViewDef> views = ViewModel.get().getViews();
        Map<String, ViewModel.ListItem> guideListItems = ViewModel.get().getGuideListItems();
        Map<String, IndexEntry> index = IndexEntry.getIndex();
        int key = 1;

        try
        {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();

            //Index views first
            for (ViewModel.ViewDef viewDef : views.values())
            {
                IndexEntry entry = new IndexEntry();
                entry.viewId = viewDef.getId();
                entry.text = viewDef.getName();
                entry.key = ++key;
                entry.type = IndexEntry.IndexType.MENU_ITEM;

                index.put(entry.text, entry);
                addEntry(entry);
            }

            //allFiles = manager.list(WWW_PATH);

            List<String> actualFiles = new ArrayList<>();

//                for(String s : allFiles)
//                {
//                    if(".xml".equals(s.substring(s.length() - 4)))
//                    {
//                        actualFiles.add(WWW_PATH + s);
//                    }
//                }


            //load all XML files
            for (ViewModel.ListItem item : guideListItems.values())
            //for(String s : actualFiles)
            {
                String s = WWW_PATH + item.getViewId().substring(6) + ".xml";
                //NOTE assets are no longer bundeled but this is no longer used.
                //I'll keep it here for now for when this code is eventually ported to a separate app
                InputStream stream = manager.open(s);
                Document dom = builder.parse(stream);

                Element root = dom.getDocumentElement();

                //make index entry for view it's self
                IndexEntry entry = new IndexEntry();
                entry.viewId = item.getViewId();
                entry.text = item.getText();
                entry.key = ++key;
                entry.type = IndexEntry.IndexType.VIEW;

                index.put(entry.text, entry);
                addEntry(entry);
                //Log.d("Indexing", "adding " + entry.text);


                //if there's no guide data continue
                if (!root.getTagName().equals("guide"))
                {
                    Log.d("Search Index", s + " not a guide");
                    continue;
                }

                for (Element e : Xml.getElements(dom.getElementsByTagName("climb")))
                {
                    IndexEntry entry1 = new IndexEntry();
                    entry1.viewId = item.getViewId();
                    entry1.viewName = item.getText();
                    entry1.elementID = e.getAttribute("id");

                    String stars = e.getAttribute("stars");
                    String grade = e.getAttribute("grade");
                    String name = e.getAttribute("name");

                    String text = String.format("%s %s %s", stars, grade, name);
                    text = text.trim();
                    entry1.text = text;

                    entry1.type = IndexEntry.IndexType.CLIMB;
                    entry1.key = ++key;

                    //Log.d("Indexing", "adding climb " + text);
                    index.put(text, entry1);
                    addEntry(entry1);

                }

                //do the same for boulder problems because teh Krauss
                for (Element e : Xml.getElements(dom.getElementsByTagName("problem")))
                {
                    IndexEntry entry1 = new IndexEntry();
                    entry1.viewId = item.getViewId();
                    entry1.viewName = item.getText();
                    entry1.elementID = e.getAttribute("id");

                    String stars = e.getAttribute("stars");
                    String grade = e.getAttribute("grade");
                    String name = e.getAttribute("name");

                    String text = String.format("%s %s %s", stars, grade, name);
                    text = text.trim();
                    entry1.text = text;

                    entry1.type = IndexEntry.IndexType.PROBLEM;
                    entry1.key = ++key;

                    //Log.d("Indexing", "adding boulder " + text);
                    index.put(text, entry1);
                    addEntry(entry1);
                }

                for (Element e : Xml.getElements(dom.getElementsByTagName("text")))
                {
                    if (e.getAttribute("class").startsWith("h"))
                    {
                        IndexEntry entry1 = new IndexEntry();
                        entry1.viewId = item.getViewId();
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

        }
        catch (Throwable e)
        {
            e.printStackTrace();
            return (long) 0;
        }

        Log.d("Search Index", "Indexing complete!");

        return (long) 1;
    }

    /**
     * helper to add an entry to the main table and the suggestions table
     */
    public void addEntry(IndexEntry entry)
    {
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

        Uri normalUri = guideListActivity.getContentResolver().insert(uri, values);

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

        guideListActivity.getContentResolver().insert(uri, suggestionValues);
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

            guideListActivity.getContentResolver().insert(builder.build(), values);
        }
    }

    @Override
    protected void onProgressUpdate(Integer... progress)
    {

    }

    @Override
    protected void onPostExecute(Long result)
    {
        guideListActivity.indexed = true;
        guideListActivity.mapsIndexed = true;
        guideListActivity.searchIndexed();
    }
}
