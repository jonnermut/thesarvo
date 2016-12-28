package com.thesarvo.guide;

import android.app.PendingIntent;
import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Messenger;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentTransaction;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.SearchView;
import android.widget.TextView;
import android.widget.Toast;

import com.android.vending.expansion.zipfile.APKExpansionSupport;
import com.google.android.vending.expansion.downloader.DownloadProgressInfo;
import com.google.android.vending.expansion.downloader.DownloaderClientMarshaller;
import com.google.android.vending.expansion.downloader.DownloaderServiceMarshaller;
import com.google.android.vending.expansion.downloader.Helpers;
import com.google.android.vending.expansion.downloader.IDownloaderClient;
import com.google.android.vending.expansion.downloader.IDownloaderService;
import com.google.android.vending.expansion.downloader.IStub;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;


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
    boolean indexed = false;
    boolean mapsIndexed = false;

    private static boolean launched = false;



    private ResourceManager resourceManager = new ResourceManager(this);

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        Log.d("Main", "Created " + getIntent().getAction() + " " + getIntent().getCategories());

        resourceManager.startup();

        //we always want to update this to the current instance
        //if (instance ==  null)
            instance = this;

        //this on create can get called at other times, we only want to do this set up once
        String id = getIntent().getStringExtra(GuideDetailFragment.ARG_ITEM_ID);
        setContentView(R.layout.activity_guide_list);

        //todo, this needs to be re-created on back press off back stack
        if(!launched)
        {
            ViewModel.get().getRootView();

            launched = true;
        }

        //if this fragment dosen't exist (ie has been poped off the back stack, recreate
        if(getSupportFragmentManager().findFragmentByTag("guidelist") == null)
        {
            GuideListFragment fragment = new GuideListFragment();
            fragment.setActivateOnItemClick(true);

            FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
            ft.add(R.id.guide_list, fragment, "guidelist");  //make sure we can find it again if needed
            ft.setTransition(FragmentTransaction.TRANSIT_NONE);
            ft.commit();

        }

        if (findViewById(R.id.guide_detail_container) != null)
        {
            // The detail container view will be present only in the
            // large-screen layouts (res/values-large and
            // res/values-sw600dp). If this view is present, then the
            // activity should be in two-pane mode.
            mTwoPane = true;

            // In two-pane mode, list items should be given the
            // 'activated' state when touched.
            GuideListFragment fragment = (GuideListFragment) getSupportFragmentManager().findFragmentByTag("guidelist");
            if(fragment != null)
            {
                fragment.setActivateOnItemClick(true);
            }


            if (id != null)
            {
                fragment.setViewDef(ViewModel.get().getViews().get(id));
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

        //if(!indexed && isDatabaseDirty(TESTER) && searchIndex == null)
        if(false) //database re-indexing not yet implemented
        {
            //this stops the indexing from starting again on resume of activity
            searchIndex = new SearchIndex(this);
            searchIndex.execute("test");
        }
        else
        {
            searchIndexed();
            //need to create the maps point list since this wasn't done
            new CreateMapsIndex(this).execute(null, null);
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
//        Fragment fragment = getSupportFragmentManager().findFragmentById(R.id.map);
//        if(fragment == null)
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




    public void onDownloadProgress(DownloadProgressInfo progress)
    {
        TextView downloadProgress = (TextView) findViewById(R.id.text_downloaded_amount);
        downloadProgress.setText(Long.toString(progress.mOverallProgress * 100 / progress.mOverallTotal) + "%");

        TextView timeRemaining = (TextView) (findViewById(R.id.text_time_remaing));
        timeRemaining.setText(Helpers.getTimeRemaining(progress.mTimeRemaining));

        TextView speed = (TextView) findViewById(R.id.text_speed_amount);
        speed.setText(Helpers.getSpeedString(progress.mCurrentSpeed));

        ProgressBar progressBar = (ProgressBar) findViewById(R.id.progressBar3);
        progressBar.setMax((int)(progress.mOverallTotal >> 8));
        progressBar.setProgress((int)(progress.mOverallProgress >> 8));
    }

    @Override
    protected void onResume() {
        resourceManager.resume(this);
        super.onResume();
    }

    @Override
    protected void onStop() {
        resourceManager.stop(this);
        super.onStop();
    }

    public ResourceManager getResourceManager()
    {
        return resourceManager;
    }
}
