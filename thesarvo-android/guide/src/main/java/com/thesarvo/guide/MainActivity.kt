package com.thesarvo.guide

import android.app.SearchManager
import android.app.SearchableInfo
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.support.design.widget.FloatingActionButton
import android.support.design.widget.NavigationView
import android.support.design.widget.Snackbar
import android.support.v4.app.Fragment
import android.support.v4.app.FragmentTransaction
import android.support.v4.view.GravityCompat
import android.support.v4.widget.DrawerLayout
import android.support.v7.app.ActionBarDrawerToggle
import android.support.v7.app.AppCompatActivity
import android.support.v7.widget.Toolbar
import android.util.Log
import android.view.Gravity
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.SearchView
import android.widget.TextView
import android.widget.Toast

import com.google.android.vending.expansion.downloader.DownloadProgressInfo
import com.unnamed.b.atv.model.TreeNode
import com.unnamed.b.atv.view.AndroidTreeView

import java.util.HashMap

class MainActivity : AppCompatActivity() {

    private var drawer: DrawerLayout? = null
    private var searchView: SearchView? = null
    private var toolbar: Toolbar? = null
    private var progressBar: ProgressBar? = null
    private var progressBarText: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d("MainActivity", "onCreate")

        super.onCreate(savedInstanceState)
        instance = this

        setContentView(R.layout.activity_main)
        toolbar = findViewById<View>(R.id.toolbar) as Toolbar
        progressBar = findViewById<View>(R.id.progress_bar) as ProgressBar
        progressBarText = findViewById<View>(R.id.progress_bar_text) as TextView

        setSupportActionBar(toolbar)

        setupNavigation(toolbar)

        setupSearch()

        //this on create can get called at other times, we only want to do this set up once
        val intent = intent
        val uri = intent.data

        val id = intent.getStringExtra(GuideDetailFragment.ARG_ITEM_ID)
        Log.d("MainActivity", "uri=$uri , id=$id")

        val handled = handleIntent(intent)
        if (!handled) {
            drawer!!.openDrawer(Gravity.LEFT)
        }
    }

    private fun setupNavigation(toolbar: Toolbar?) {
        drawer = findViewById<View>(R.id.drawer_layout) as DrawerLayout
        val toggle = ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close)
        drawer!!.addDrawerListener(toggle)
        toggle.syncState()

        //NavigationView navigationView = (NavigationView) findViewById(R.id.nav_view);
        //navigationView.setNavigationItemSelectedListener(this);

        val leftLayout = findViewById<View>(R.id.left_layout) as LinearLayout

        val root = TreeNode.root()

        val viewDef = ViewModel.get().rootView
        addListItems(root, viewDef!!, 0)

        val tView = AndroidTreeView(this, root)
        tView.setDefaultViewHolder(NodeViewHolder::class.java)
        tView.setDefaultAnimation(true)
        tView.setDefaultNodeClickListener { node, value ->
            if (value is ViewModel.ListItem) {
                onItemSelected(value)
            }
        }
        leftLayout.addView(tView.view)
    }

    private fun setupSearch() {
        //start with the search bar disabled
        val searchManager = getSystemService(Context.SEARCH_SERVICE) as SearchManager

        searchView = findViewById<View>(R.id.search_view) as SearchView

        val info = searchManager.getSearchableInfo(componentName)
        searchView!!.setSearchableInfo(info)

        //searchView.setEnabled(false);
        //searchView.setClickable(false);
        //searchView.setVisibility(View.INVISIBLE);


    }

    private fun addListItems(root: TreeNode, viewDef: ViewModel.ViewDef, level: Int) {
        var level = level
        for (lv in viewDef.getListItems()) {
            val n = TreeNode(lv)
            root.addChild(n)

            val kidView = ViewModel.get().getViews()[lv.viewId]
            if (kidView != null) {
                lv.isLeaf = false
                addListItems(n, kidView, level++)
            }
        }
    }

    fun onItemSelected(item: ViewModel.ListItem) {
        if (!item.isLeaf)
            return

        val id = item.viewId

        if (id == null || id.length == 0)
            return

        drawer!!.closeDrawer(Gravity.LEFT)

        if (id.startsWith("http") || id.startsWith("guide.")) {
            showGuideDetail(id, null, false, null)

        } else if (id.startsWith("Map")) {
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
        } else {
            //showGuideDetail(id, null, true, null);
            val args = HashMap<String, String>()
            args[GuideDetailFragment.ARG_ITEM_ID] = id
            showFragment(GuideListFragment::class.java, args, true, true)


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
    fun showGuideDetail(id: String?, singleNodeData: String?, history: Boolean, elementId: String?) {
        val args = HashMap<String, String>()
        if (id != null)
            args[GuideDetailFragment.ARG_ITEM_ID] = id

        if (elementId != null)
            args[GuideDetailFragment.ELEMENT_ID] = elementId

        if (singleNodeData != null)
            args[GuideDetailFragment.SINGLE_NODE_DATA] = singleNodeData

        showFragment(GuideDetailFragment::class.java, args, history, false)
    }

    fun showMap(singleNodeData: String?) {
        val args = HashMap<String, String>()
        if (singleNodeData != null)
            args[GuideDetailFragment.SINGLE_NODE_DATA] = singleNodeData

        //instead of just creating a new one see if one exists
        //        Fragment fragment = getSupportFragmentManager().findFragmentById(R.id.map);
        //        if(fragment == null)
        showFragment(MapsFragment::class.java, args, true, false)
    }

    fun showFragment(fragmentClass: Class<*>, args: Map<String, String>?, includeInHistory: Boolean, leftPane: Boolean) {
        val arguments = Bundle()

        if (args != null) {
            for (key in args.keys) {
                arguments.putString(key, args[key])
            }
        }

        var fragment: Fragment? = null

        try {
            fragment = fragmentClass.newInstance() as Fragment
        } catch (e: Exception) {
            e.printStackTrace()
        }

        fragment!!.arguments = arguments


        // In two-pane mode, show the detail view in this activity by
        // adding or replacing the detail fragment using a
        // fragment transaction.


        val container = R.id.guide_detail_container2

        /** TODO
         * if (leftPane)
         * {
         * container = R.id.guide_list;
         * } */
        addFragment(container, fragment, includeInHistory)

    }


    fun addFragment(fragmentId: Int, newFragment: android.support.v4.app.Fragment, history: Boolean) {
        // Add the fragment to the activity, pushing this transaction
        // on to the back stack.
        val ft = supportFragmentManager.beginTransaction()
        //getFragmentManager().beginTransaction();
        ft.replace(fragmentId, newFragment)
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE)

        if (history)
            ft.addToBackStack(null)
        ft.commit()


        Log.d("Add Fragment", "Added")
    }

    fun addDoubleFragment(fragId1: Int, fragId2: Int, frag1: android.support.v4.app.Fragment,
                          frag2: android.support.v4.app.Fragment, history: Boolean) {
        val ft = supportFragmentManager.beginTransaction()
        //getFragmentManager().beginTransaction();
        ft.replace(fragId1, frag1)
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE)
        ft.replace(fragId2, frag2)
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE)

        if (history)
            ft.addToBackStack(null)
        ft.commit()


        Log.d("Add Fragment", "Double Added")
    }

    override fun onBackPressed() {
        val drawer = findViewById<View>(R.id.drawer_layout) as DrawerLayout
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START)
        } else {
            super.onBackPressed()
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        // Inflate the menu; this adds items to the action bar if it is present.
        menuInflater.inflate(R.menu.main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        val id = item.itemId


        return if (id == R.id.action_settings) {
            true
        } else super.onOptionsItemSelected(item)

    }

    fun setProgress(complete: Long, total: Long, text: String) {
        Handler(Looper.getMainLooper()).post {
            if (progressBar != null && progressBarText != null) {
                progressBar!!.max = total.toInt()
                progressBar!!.progress = complete.toInt()
                progressBarText!!.text = text

                val show = total > complete
                progressBar!!.visibility = if (show) View.VISIBLE else View.GONE
                progressBarText!!.visibility = if (show) View.VISIBLE else View.GONE
            }
        }

    }

    @JvmOverloads
    fun showSearchResult(uri: Uri, query: String? = null) {
        Log.d("Search Result", uri.toString())


        //get a cursor representing the entry
        val c = contentResolver.query(uri, SEARCH_PROJECTION, null, null, null)
        if (c!!.count < 1) {
            Log.d("Search Result", "Error, entry not found!")
        } else if (c.count > 1) {
            Log.d("Search Result", "Error, multiple found! found!")
        } else {
            val v = c.getColumnIndex(SEARCH_PROJECTION[0])
            val e = c.getColumnIndex(SEARCH_PROJECTION[1])

            //Log.d("Quick Search Back", "Looking at col " + v + " and " + e + " of " + c.getColumnCount());
            c.moveToFirst()
            val viewId = c.getString(v)
            val elementID = c.getString(e)

            Log.d("Search Result", "Selected view $viewId el $elementID")


            showGuideDetail(viewId, null, true, elementID)

        }

    }

    override fun onNewIntent(intent: Intent) {
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent): Boolean {
        val action = intent.action
        val uri = intent.data


        Log.d("New Intent", "New intent " + action!!)

        if (action == Intent.ACTION_SEARCH) {
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
            return true
        } else if (action == Intent.ACTION_VIEW)
        //probably shouldn't be something so generic, will need to be changed if ever end up using action view
        {
            Log.d("Quick Search Back", uri!!.toString())

            //get the query and display it on the side if in two pane mode
            //if(mTwoPane)
            // {
            val query = searchView!!.query.toString()
            //Map<String, String> args = new HashMap<String, String>();
            //args.put(SearchableActivity.SEARCH_ITEM_QUERY, query);
            searchView!!.isIconified = true //need to do this before the fragement transaction

            //showFragment(SearchResultsFragment.class, args, true, true);
            //}

            //searchView.setIconified(true);
            showSearchResult(uri, query)
            searchView!!.isIconified = true

            return true
        }
        return false
    }

    companion object {
        private val SEARCH_PROJECTION = arrayOf("VIEW_ID", "ELEMENT_ID")

        private var instance: MainActivity? = null

        fun get(): MainActivity? {
            return instance
        }
    }

}
