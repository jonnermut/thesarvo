package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentTransaction;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.SearchView;
import android.widget.Toast;

import com.google.android.gms.maps.model.LatLng;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;


/**
 * An activity representing a list of Guides. This activity
 * has different presentations for handset and tablet-size devices. On
 * handsets, the activity presents a list of items, which when touched,
 * lead to a {@link GuideDetailActivity} representing
 * item details. On tablets, the activity presents the list of items and
 * item details side-by-side using two vertical panes.
 * <p/>
 * The activity makes heavy use of fragments. The list of items is a
 * {@link GuideListFragment} and the item details
 * (if present) is a {@link GuideDetailFragment}.
 * <p/>
 * This activity also implements the required
 * {@link GuideListFragment.Callbacks} interface
 * to listen for item selections.
 */
public class GuideListActivity extends FragmentActivity
        implements GuideListFragment.Callbacks
{

    private static final String DB_BUILD = "database build date";

    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    private boolean mTwoPane;

    private static GuideListActivity instance = null;

    public static GuideListActivity get()
    {
        return  instance;
    }

    private SearchView searchView;
    private MenuItem searchViewMenuItem;
    private boolean indexed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        if (instance ==  null)
            instance = this;

        ViewModel.get().getRootView();

        String id = getIntent().getStringExtra(GuideDetailFragment.ARG_ITEM_ID);
        String action = getIntent().getAction();


        setContentView(R.layout.activity_guide_list);

        if (findViewById(R.id.guide_detail_container) != null)
        {
            // The detail container view will be present only in the
            // large-screen layouts (res/values-large and
            // res/values-sw600dp). If this view is present, then the
            // activity should be in two-pane mode.
            mTwoPane = true;

            // In two-pane mode, list items should be given the
            // 'activated' state when touched.
            GuideListFragment fragment = (GuideListFragment) getSupportFragmentManager().findFragmentById(R.id.guide_list);
            fragment.setActivateOnItemClick(true);

            if (id != null)
            {
                fragment.setViewDef( ViewModel.get().getViews().get(id) );
            }
        }

        if(action.equals(SearchableActivity.SEARCH_ITEM_SELECTED))
        {
            IndexEntry entry = SearchableActivity.getLastResult();
            if(entry != null)
            {
                //TODO make it so it goes to elementID
                showDetail(entry.viewId, null, false);
            }
        }

        // TODO: If exposing deep links into your app, handle intents here.
    }

    /**
     * Callback method from {@link GuideListFragment.Callbacks}
     * indicating that the item with the given ID was selected.
     */
    @Override
    public void onItemSelected(String id)
    {
        if (id==null || id.length() == 0)
            return;

        if (id.startsWith("http") || id.startsWith("guide."))
        {
            showDetail(id, null, false);

        }
        else if(id.startsWith("Map"))
        {
            //start the map activity
            if(indexed)
            {
                Intent intent = new Intent(this, MapsActivity.class);
                startActivity(intent);
            }
            else
            {
                Toast.makeText(this, "Maps not ready yet!", Toast.LENGTH_SHORT).show();
            }
        }
        else
        {
            if (mTwoPane)
            {
                // In two-pane mode, show the detail view in this activity by
                // adding or replacing the detail fragment using a
                // fragment transaction.
                Bundle arguments = new Bundle();
                arguments.putString(GuideDetailFragment.ARG_ITEM_ID, id);
                GuideListFragment fragment = new GuideListFragment();
                fragment.setArguments(arguments);
                int guide_list_id = R.id.guide_list;

                addFragment(guide_list_id, fragment, true);


            }
            else
            {
                // FIXME - args not getting through!
                Intent listIntent = new Intent(this, GuideListActivity.class);
                listIntent.putExtra(GuideDetailFragment.ARG_ITEM_ID, id);
                startActivity(listIntent);
            }
        }


    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu items for use in the action bar
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.action_bar, menu);


        //start with the search bar disabled
        SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);
        MenuItem searchViewItem = menu.findItem(R.id.action_search);
        searchViewMenuItem = searchViewItem;
        searchViewMenuItem.setVisible(false);
        SearchView searchView = (SearchView) searchViewItem.getActionView();

        //TODO needs the component name of SearchableActivity, I think...
        searchView.setSearchableInfo(searchManager.getSearchableInfo(getComponentName()));
        searchView.setEnabled(false);
        searchView.setClickable(false);
        searchView.setVisibility(View.INVISIBLE);
        this.searchView = searchView;

        //TODO, we only want indexing to happen if things are changed
        //TODO, we still need to traverse the maps when we don't index
        //TODO, need to drop tables if re-creating
        if(!indexed && isDatabaseDirty(10000003))
            new SearchIndex().execute("test");
        else
            searchIndexed();

        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle presses on the action bar items
        switch (item.getItemId()) {
            case R.id.action_search:
                SearchView searchView = (SearchView) item.getActionView();
                //start the async process
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    //callback for after the index is done
    public void searchIndexed(){
        searchView.setEnabled(true);
        searchView.setClickable(true);
        searchView.setVisibility(View.VISIBLE);
        searchViewMenuItem.setVisible(true);

        //update the database build date
        SharedPreferences prefs = getPreferences(MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putInt(DB_BUILD, 10000003);
        editor.apply();
    }

    public void showDetail(String id, String singleNodeData, boolean history)
    {
        if (mTwoPane)
        {
            // In two-pane mode, show the detail view in this activity by
            // adding or replacing the detail fragment using a
            // fragment transaction.
            Bundle arguments = new Bundle();
            arguments.putString(GuideDetailFragment.ARG_ITEM_ID, id);

            if (singleNodeData != null)
                arguments.putString(GuideDetailFragment.SINGLE_NODE_DATA, singleNodeData);

            GuideDetailFragment fragment = new GuideDetailFragment();
            fragment.setArguments(arguments);


            addFragment(R.id.guide_detail_container, fragment, history);
        }
        else
        {
            // In single-pane mode, simply start the detail activity
            // for the selected item ID.
            Intent detailIntent = new Intent(this, GuideDetailActivity.class);
            detailIntent.putExtra(GuideDetailFragment.ARG_ITEM_ID, id);
            startActivity(detailIntent);
        }
    }

    public void addFragment(int fragmentId, android.support.v4.app.Fragment newFragment, boolean history)
    {
        // Add the fragment to the activity, pushing this transaction
        // on to the back stack.
        FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
        //getFragmentManager().beginTransaction();
        ft.replace(fragmentId, newFragment);
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE);

        if (history)
            ft.addToBackStack(null);
        ft.commit();
    }

    /**
     * Check if the database needs rebuilding
     * @return true if the database is dirty and needs updating
     */
    private boolean isDatabaseDirty(int curBuildNum)
    {
        SharedPreferences prefs = getPreferences(MODE_PRIVATE);
        if(prefs.contains(DB_BUILD))
        {
            int buildNum = prefs.getInt(DB_BUILD, 0);
            //TODO put the buildNum somewhere
            if(buildNum < curBuildNum)
            {
                Log.d("Database Check", "buildNum " + buildNum + " < cur build" + curBuildNum);
                return true;
            }
            else
            {
                Log.d("Database Check", "Database up to date!");
                return false;
            }
        }
        else    //if the pref dosen't exist then we need to build
        {
            Log.d("Database Check", "No prefs present, first run");
            return true;
        }
    }

    private class SearchIndex extends AsyncTask<String, Integer, Long>
    {
        final String WWW_PATH = "www/data/";

        protected Long doInBackground(String... files)
        {
            //find all XML files
            String[] allFiles;
            AssetManager manager = getAssets();
            Map<String, ViewModel.ViewDef> views = ViewModel.get().getViews();
            Map<String, ViewModel.ListItem> guideListItems = ViewModel.get().getGuideListItems();
            Map<String, IndexEntry> index = IndexEntry.getIndex();
            int key = 1;

            try
            {
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                DocumentBuilder  builder = factory.newDocumentBuilder();

                //Index views first
                for(ViewModel.ViewDef viewDef : views.values())
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
                for(ViewModel.ListItem item : guideListItems.values())
                //for(String s : actualFiles)
                {
                    String s = WWW_PATH + item.getViewId().substring(6) +  ".xml";
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
                    if(!root.getTagName().equals("guide"))
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
                    for(Element e : Xml.getElements(dom.getElementsByTagName("problem")))
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

                    for(Element e :Xml.getElements(dom.getElementsByTagName("text")))
                    {
                        if(e.getAttribute("class").startsWith("h"))
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


                    List<GPSNode> gpsNodes = MapsActivity.getGPSPoints();

                    for(Element e : Xml.getElements(dom.getElementsByTagName("gps")))
                    {
                        String id = e.getAttribute("id");
                        List<Point> points = new ArrayList<>();

                        for(Element ePoint : Xml.getElements(e.getElementsByTagName("point")))
                        {
                            Point point;

                            String longitude = ePoint.getAttribute("longitude");
                            String latitude = ePoint.getAttribute("latitude");
                            String description = ePoint.getAttribute("description");
                            String code = ePoint.getAttribute("code");

                            double lon, lat;

                            try
                            {
                                lon = Double.valueOf(longitude);
                                lat = Double.valueOf(latitude);
                            }
                            catch (NumberFormatException ex)
                            {
                                ex.printStackTrace();
                                continue;
                            }

                            LatLng latLng = new LatLng(lat, lon);

                            point = new Point(latLng, description, code);
                            points.add(point);

                        }


                        //Log.d("Indexing", "adding gps node for " + item.getText());
                        GPSNode gpsnode = new GPSNode(id, points);
                        gpsNodes.add(gpsnode);

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

            Uri normalUri = getContentResolver().insert(uri, values);

            //create the suggestion entry
            ContentValues suggestionValues = new ContentValues();
            suggestionValues.put(SearchManager.SUGGEST_COLUMN_TEXT_1, entry.text);
            suggestionValues.put(SearchManager.SUGGEST_COLUMN_TEXT_2, entry.viewName);
            suggestionValues.put(SearchManager.SUGGEST_COLUMN_INTENT_DATA_ID, normalUri.toString());

            builder.clearQuery();
            builder.scheme(ContentResolver.SCHEME_CONTENT);
            builder.authority(IndexContentProvider.AUTHORITY);
            builder.path(IndexContentProvider.SUGESTIONS_TABLE);
            uri = builder.build();

            getContentResolver().insert(uri, suggestionValues);
        }

        @Override
        protected void onProgressUpdate(Integer... progress)
        {

        }

        @Override
        protected void onPostExecute(Long result)
        {
            indexed = true;
            searchIndexed();
        }
    }



}
