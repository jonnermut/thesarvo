package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.app.Fragment;
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
import java.util.HashMap;
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
        implements GuideListFragment.Callbacks,
        SearchResultsFragment.OnFragmentInteractionListener
{

    private static final String DB_BUILD = "database build date";
    private static final int TESTER = 10000017;
    private static final String[] SEARCH_PROJECTION = {"VIEW_ID", "ELEMENT_ID"};

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

    private static SearchIndex searchIndex = null;

    private SearchView searchView;
    private MenuItem searchViewMenuItem;
    private boolean indexed = false;
    private boolean mapsIndexed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        if (instance ==  null)
            instance = this;

        ViewModel.get().getRootView();

        String id = getIntent().getStringExtra(GuideDetailFragment.ARG_ITEM_ID);

        setContentView(R.layout.activity_guide_list);

        GuideListFragment fragment = new GuideListFragment();

        FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
        ft.add(R.id.guide_list, fragment,"guidelist");  //make sure we can find it again if needed
        ft.setTransition(FragmentTransaction.TRANSIT_NONE);
        ft.commit();

        if (findViewById(R.id.guide_detail_container) != null)
        {
            // The detail container view will be present only in the
            // large-screen layouts (res/values-large and
            // res/values-sw600dp). If this view is present, then the
            // activity should be in two-pane mode.
            mTwoPane = true;

            // In two-pane mode, list items should be given the
            // 'activated' state when touched.
            //GuideListFragment fragment = (GuideListFragment) getSupportFragmentManager().findFragmentById(R.id.guide_list);
            fragment.setActivateOnItemClick(true);

            if (id != null)
            {
                fragment.setViewDef( ViewModel.get().getViews().get(id) );
            }
        }

        // TODO: If exposing deep links into your app, handle intents here.
    }

    @Override
    protected void onNewIntent(Intent intent)
    {
        setIntent(intent);
        String action = intent.getAction();
        Uri uri = intent.getData();


        Log.d("New Intent", "New intent " + action);

        if(action.equals(Intent.ACTION_SEARCH))
        {
            String query = searchView.getQuery().toString();
            searchView.setIconified(true);

            //intent seems to be passed 3 times
            Log.d("Normal search back", "query is " + query);
            //showSearchResult(uri);

            Map<String, String> args = new HashMap<String, String>();
            args.put(SearchableActivity.SEARCH_ITEM_QUERY, query);

            showFragment(SearchResultsFragment.class, args, true, true);
            searchView.setIconified(true);

        }
        else if (action.equals(Intent.ACTION_VIEW)) //probably shouldn't be something so generic, will need to be changed if ever end up using action view
        {
            Log.d("Quick Search Back", uri.toString());

            //get the query and display it on the side if in two pane mode
            //if(mTwoPane)
           // {
                String query = searchView.getQuery().toString();
                //Map<String, String> args = new HashMap<String, String>();
                //args.put(SearchableActivity.SEARCH_ITEM_QUERY, query);
                searchView.setIconified(true); //need to do this before the fragement transaction

                //showFragment(SearchResultsFragment.class, args, true, true);
            //}

            //searchView.setIconified(true);
            showSearchResult(uri, query);
           searchView.setIconified(true);
        }
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
            showGuideDetail(id, null, !mTwoPane, null);

        }
        else if(id.startsWith("Map"))
        {
            //start the map activity
            if(mapsIndexed)
            {
                //Intent intent = new Intent(this, MapsFragment.class);
                //startActivity(intent);

                showMap(null);
            }
            else
            {
                Toast.makeText(this, "Maps not ready yet!", Toast.LENGTH_SHORT).show();
            }
        }
        else
        {
            //showGuideDetail(id, null, true, null);
            Map<String, String> args = new HashMap<String, String>();
            args.put(GuideDetailFragment.ARG_ITEM_ID, id);
            showFragment(GuideListFragment.class, args, true, true );


        }


    }

    @Override
    public void onSearchFragmentInteraction(String id)
    {
        Uri.Builder builder = new Uri.Builder();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.MAIN_TABLE + "/" + id);

        showSearchResult(builder.build());
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu)
    {
        // Inflate the menu items for use in the action bar
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.action_bar, menu);


        //start with the search bar disabled
        SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);
        MenuItem searchViewItem = menu.findItem(R.id.action_search);
        searchViewMenuItem = searchViewItem;
        searchViewMenuItem.setVisible(false);
        SearchView searchView = (SearchView) searchViewItem.getActionView();

        searchView.setSearchableInfo(searchManager.getSearchableInfo(getComponentName()));
        searchView.setEnabled(false);
        searchView.setClickable(false);
        searchView.setVisibility(View.INVISIBLE);
        this.searchView = searchView;

        if(!indexed && isDatabaseDirty(TESTER) && searchIndex == null)
        {
            //this stops the indexing from starting again on resume of activity
            searchIndex = new SearchIndex();
            searchIndex.execute("test");
        }
        else
        {
            searchIndexed();
            //need to create the maps point list since this wasn't done
            new CreateMapsIndex().execute(null, null);
        }

        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle presses on the action bar items
        switch (item.getItemId()) {
            /*case R.id.action_search:
                SearchView searchView = (SearchView) item.getActionView();
                //start the async process
                return true;*/
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
        editor.putInt(DB_BUILD, TESTER);
        editor.apply();

        indexed = true;
        searchIndex = null;
    }

    public void showSearchResult(Uri uri)
    {
        showSearchResult(uri, null);
    }

    public void showSearchResult(Uri uri, String query)
    {
        Log.d("Search Result", uri.toString());
        //get a cursor representing the entry
        Cursor c = getContentResolver().query(uri, SEARCH_PROJECTION, null, null, null);
        if(c.getCount() < 1)
        {
            Log.d("Search Result", "Error, entry not found!");
        }
        else if (c.getCount() > 1)
        {
            Log.d("Search Result", "Error, multiple found! found!");
        }
        else
        {
            int v = c.getColumnIndex(SEARCH_PROJECTION[0]);
            int e = c.getColumnIndex(SEARCH_PROJECTION[1]);

            //Log.d("Quick Search Back", "Looking at col " + v + " and " + e + " of " + c.getColumnCount());
            c.moveToFirst();
            String viewId = c.getString(v);
            String elementID = c.getString(e);

            Log.d("Search Result", "Selected view " + viewId + " el " + elementID);

            if(mTwoPane && query != null)
            {
                Bundle args = new Bundle();
                args.putString(GuideDetailFragment.ARG_ITEM_ID, viewId);
                args.putString(GuideDetailFragment.ELEMENT_ID, elementID);
                GuideDetailFragment fragment = new GuideDetailFragment();
                fragment.setArguments(args);

                args = new Bundle();
                args.putString(SearchableActivity.SEARCH_ITEM_QUERY, query);
                SearchResultsFragment resultsFragment = new SearchResultsFragment();
                resultsFragment.setArguments(args);

                addDoubleFragment(R.id.guide_detail_container, R.id.guide_list,
                        fragment, resultsFragment, true);
            }
            else
            {
                showGuideDetail(viewId, null, true, elementID);
            }
        }
    }

    /**
     * Show a GuideDetailFragment
     *
     * @param id
     * @param singleNodeData
     * @param history
     * @param elementId
     */
    public void showGuideDetail(String id, String singleNodeData, boolean history, String elementId)
    {
        Map<String, String> args = new HashMap<>();
        if (id != null)
            args.put(GuideDetailFragment.ARG_ITEM_ID, id);

        if (elementId != null)
            args.put(GuideDetailFragment.ELEMENT_ID, elementId);

        if (singleNodeData != null)
            args.put(GuideDetailFragment.SINGLE_NODE_DATA, singleNodeData);

        showFragment(GuideDetailFragment.class, args, history, false);
    }

    public void showMap(String singleNodeData)
    {
        Map<String, String> args = new HashMap<>();
        if (singleNodeData != null)
            args.put(GuideDetailFragment.SINGLE_NODE_DATA, singleNodeData);

        //instead of just creating a new one see if one exists
        Fragment fragment = getSupportFragmentManager().findFragmentById(R.id.map);
        if(fragment == null)
            showFragment(MapsFragment.class, args, true, false);
    }

    public void showFragment( Class<?> fragmentClass, Map<String, String> args, boolean includeInHistory, boolean leftPane)
    {
        Bundle arguments = new Bundle();

        if(args != null)
        {
            for (String key : args.keySet())
            {
                arguments.putString(key, args.get(key));
            }
        }

        Fragment fragment = null;

        try
        {
            fragment = (Fragment) fragmentClass.newInstance();
        }
        catch (Exception e)
        {
            e.printStackTrace();
        }

        fragment.setArguments(arguments);


        if (mTwoPane)
        {
            // In two-pane mode, show the detail view in this activity by
            // adding or replacing the detail fragment using a
            // fragment transaction.


            int container = R.id.guide_detail_container;
            if (leftPane)
            {
                container = R.id.guide_list;
            }
            addFragment(container, fragment, includeInHistory);
        }
        else
        {
            // In single-pane mode, simply start the detail activity
            // for the selected item ID.
            /*
            Intent detailIntent = new Intent(this, fragmentClass);

            for (String key : args.keySet())
            {
                detailIntent.putExtra(key, args.get(key));
            }
            startActivity(detailIntent);
            */
            addFragment(R.id.guide_list, fragment, includeInHistory);
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


        Log.d("Add Fragment", "Added");
    }

    public void addDoubleFragment(int fragId1, int fragId2, android.support.v4.app.Fragment frag1,
                                  android.support.v4.app.Fragment frag2, boolean history)
    {
        FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
        //getFragmentManager().beginTransaction();
        ft.replace(fragId1, frag1);
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE);
        ft.replace(fragId2, frag2);
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE);

        if (history)
            ft.addToBackStack(null);
        ft.commit();


        Log.d("Add Fragment", "Double Added");
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
            //delete the old database first
            getBaseContext().deleteDatabase(IndexContentProvider.DBNAME);

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


                    List<GPSNode> gpsNodes = MapsFragment.getGPSPoints();

                    for (Element e : Xml.getElements(dom.getElementsByTagName("gps")))
                    {
                        String id = e.getAttribute("id");
                        List<Point> points = new ArrayList<>();

                        for(Element ePoint : Xml.getElements(e.getElementsByTagName("point")))
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

            Uri normalUri = getContentResolver().insert(uri, values);

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

            getContentResolver().insert(uri, suggestionValues);
        }

        public void addGPSEntry(GPSNode node)
        {
            for(Point p : node.getPoints())
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

                getContentResolver().insert(builder.build(), values);
            }
        }

        @Override
        protected void onProgressUpdate(Integer... progress)
        {

        }

        @Override
        protected void onPostExecute(Long result)
        {
            indexed = true;
            mapsIndexed = true;
            searchIndexed();
        }
    }

    private class CreateMapsIndex extends AsyncTask<Void, Void, Void>
    {
        @Override
        protected Void doInBackground(Void... voids)
        {
            List<GPSNode> nodes = MapsFragment.getGPSPoints();

            Uri.Builder builder = new Uri.Builder();
            builder.scheme(ContentResolver.SCHEME_CONTENT);
            builder.authority(IndexContentProvider.AUTHORITY);
            builder.path(IndexContentProvider.MAP_TABLE);

            //getting all is inefficient, but we can do this async and we do need all that data
            Cursor cursor = getContentResolver().query(builder.build(), null, null, null, null);

            if(cursor == null || cursor.getCount() < 1)
            {
                Log.d("Creating maps index", "something went wrong getting cursor!");
                return null;
            }

            int id = -1;
            GPSNode current;
            List<Point> points = new ArrayList<>(); //new will never get used but is needed for compliation

            while(cursor.moveToNext())
            {
                String sID = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_GPS_ID));
                int newID = Integer.valueOf(sID);

                //start a new GPS node if necessary, should aways happen on first run
                if(newID != id)
                {
                    points = new ArrayList<>();
                    current = new GPSNode(sID, points);
                    nodes.add(current);
                    id = newID;
                }

                double lat = cursor.getDouble(cursor.getColumnIndex(IndexContentProvider.COL_LAT));
                double lng = cursor.getDouble(cursor.getColumnIndex(IndexContentProvider.COL_LNG));
                String desc = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_DESC));
                String code = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_CODE));

                points.add(new Point(new LatLng(lat, lng), desc, code));
            }


            return null;
        }

        @Override
        protected void onPostExecute(Void aVoid)
        {
            super.onPostExecute(aVoid);
            mapsIndexed = true;
            Log.d("Map Index", "Map index data created");
        }

        @Override
        protected void onProgressUpdate(Void... values)
        {
            super.onProgressUpdate(values);
        }
    }


}
