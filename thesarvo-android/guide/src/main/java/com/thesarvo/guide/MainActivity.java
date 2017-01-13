package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.NavigationView;
import android.support.design.widget.Snackbar;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentTransaction;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.SearchView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.vending.expansion.downloader.DownloadProgressInfo;
import com.unnamed.b.atv.model.TreeNode;
import com.unnamed.b.atv.view.AndroidTreeView;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity
{
    private static final String[] SEARCH_PROJECTION = {"VIEW_ID", "ELEMENT_ID"};

    private DrawerLayout drawer;

    private static MainActivity instance = null;
    private SearchView searchView;
    private Toolbar toolbar;
    private ProgressBar progressBar;
    private TextView progressBarText;

    public static MainActivity get()
    {
        return instance;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        Log.d("MainActivity", "onCreate");

        super.onCreate(savedInstanceState);
        instance = this;

        setContentView(R.layout.activity_main);
        toolbar = (Toolbar) findViewById(R.id.toolbar);
        progressBar = (ProgressBar) findViewById(R.id.progress_bar);
        progressBarText = (TextView) findViewById(R.id.progress_bar_text);

        setSupportActionBar(toolbar);

        setupNavigation(toolbar);

        setupSearch();

        //this on create can get called at other times, we only want to do this set up once
        final Intent intent = getIntent();
        Uri uri = intent.getData();

        String id = intent.getStringExtra(GuideDetailFragment.ARG_ITEM_ID);
        Log.d("MainActivity", "uri=" + uri + " , id=" + id);

        boolean handled = handleIntent(intent);
        if (!handled)
        {
            drawer.openDrawer(Gravity.LEFT);
        }
    }

    private void setupNavigation(Toolbar toolbar)
    {
        drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.addDrawerListener(toggle);
        toggle.syncState();

        //NavigationView navigationView = (NavigationView) findViewById(R.id.nav_view);
        //navigationView.setNavigationItemSelectedListener(this);

        LinearLayout leftLayout = (LinearLayout) findViewById(R.id.left_layout);

        TreeNode root = TreeNode.root();

        ViewModel.ViewDef viewDef = ViewModel.get().getRootView();
        addListItems(root, viewDef, 0);

        AndroidTreeView tView = new AndroidTreeView(this, root);
        tView.setDefaultViewHolder(NodeViewHolder.class);
        tView.setDefaultAnimation(true);
        tView.setDefaultNodeClickListener((node, value) -> {
            if (value instanceof ViewModel.ListItem)
            {
                onItemSelected((ViewModel.ListItem) value);
            }
        });
        leftLayout.addView(tView.getView());
    }

    private void setupSearch()
    {
        //start with the search bar disabled
        SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);

        searchView = (SearchView) findViewById(R.id.search_view);

        searchView.setSearchableInfo(searchManager.getSearchableInfo(getComponentName()));

        //searchView.setEnabled(false);
        //searchView.setClickable(false);
        //searchView.setVisibility(View.INVISIBLE);


    }

    private void addListItems(TreeNode root, ViewModel.ViewDef viewDef, int level)
    {
        for (ViewModel.ListItem lv : viewDef.getListItems())
        {
            TreeNode n = new TreeNode(lv);
            root.addChild(n);

            ViewModel.ViewDef kidView = ViewModel.get().getViews().get(lv.getViewId());
            if (kidView != null)
            {
                lv.setLeaf(false);
                addListItems(n, kidView, level++);
            }
        }
    }

    public void onItemSelected(ViewModel.ListItem item)
    {
        if (!item.isLeaf())
            return;

        String id = item.getViewId();

        if (id == null || id.length() == 0)
            return;

        drawer.closeDrawer(Gravity.LEFT);

        if (id.startsWith("http") || id.startsWith("guide."))
        {
            showGuideDetail(id, null, false, null);

        }
        else if (id.startsWith("Map"))
        {
            //start the map activity
            /* TODO
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
            */
        }
        else
        {
            //showGuideDetail(id, null, true, null);
            Map<String, String> args = new HashMap<String, String>();
            args.put(GuideDetailFragment.ARG_ITEM_ID, id);
            showFragment(GuideListFragment.class, args, true, true);


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

    public void showFragment(Class<?> fragmentClass, Map<String, String> args, boolean includeInHistory, boolean leftPane)
    {
        Bundle arguments = new Bundle();

        if (args != null)
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


        // In two-pane mode, show the detail view in this activity by
        // adding or replacing the detail fragment using a
        // fragment transaction.


        int container = R.id.guide_detail_container2;

        /** TODO
         if (leftPane)
         {
         container = R.id.guide_list;
         }*/
        addFragment(container, fragment, includeInHistory);

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

    @Override
    public void onBackPressed()
    {
        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        if (drawer.isDrawerOpen(GravityCompat.START))
        {
            drawer.closeDrawer(GravityCompat.START);
        }
        else
        {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu)
    {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item)
    {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings)
        {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    public void setProgress(long complete, long total, String text)
    {
        new Handler(Looper.getMainLooper()).post( () -> {
            if (progressBar != null && progressBarText != null)
            {
                progressBar.setMax((int)(total));
                progressBar.setProgress((int)(complete));
                progressBarText.setText(text);

                boolean show = total > complete;
                progressBar.setVisibility( show ? View.VISIBLE : View.GONE );
                progressBarText.setVisibility( show ? View.VISIBLE : View.GONE );
            }
        });

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


            showGuideDetail(viewId, null, true, elementID);

        }

    }

    @Override
    protected void onNewIntent(Intent intent)
    {
        setIntent(intent);
        handleIntent(intent);
    }

    private boolean handleIntent(Intent intent)
    {
        String action = intent.getAction();
        Uri uri = intent.getData();


        Log.d("New Intent", "New intent " + action);

        if(action.equals(Intent.ACTION_SEARCH))
        {
            /* TODO - work this out
            String query = searchView.getQuery().toString();
            searchView.setIconified(true);

            //intent seems to be passed 3 times
            Log.d("Normal search back", "query is " + query);
            //showSearchResult(uri);

            Map<String, String> args = new HashMap<String, String>();
            args.put(SearchableActivity.SEARCH_ITEM_QUERY, query);

            showFragment(SearchResultsFragment.class, args, true, true);
            searchView.setIconified(true);
            */
            return true;
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

            return true;
        }
        return false;
    }

}
