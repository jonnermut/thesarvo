package com.thesarvo.guide

import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.SearchView
import android.widget.TextView
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.GravityCompat
import com.unnamed.b.atv.model.TreeNode
import com.unnamed.b.atv.view.AndroidTreeView
import java.util.*

class MainActivity : AppCompatActivity()
{

    private var drawer: androidx.drawerlayout.widget.DrawerLayout? = null
    private var searchView: SearchView? = null
    private var toolbar: Toolbar? = null
    private var progressBar: ProgressBar? = null
    private var progressBarText: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?)
    {
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
        if (!handled)
        {
            drawer!!.openDrawer(Gravity.LEFT)
        }
    }

    private fun setupNavigation(toolbar: Toolbar?)
    {
        drawer = findViewById<View>(R.id.drawer_layout) as androidx.drawerlayout.widget.DrawerLayout
        val toggle = ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close)
        drawer!!.addDrawerListener(toggle)
        toggle.syncState()

        //NavigationView navigationView = (NavigationView) findViewById(R.id.nav_view);
        //navigationView.setNavigationItemSelectedListener(this);

        val leftLayout = findViewById<View>(R.id.left_layout) as LinearLayout

        val root = TreeNode.root()

        val viewDef = Model.get().rootGuide
        addListItems(root, viewDef, 0)

        val tView = AndroidTreeView(this, root)
        tView.setDefaultViewHolder(NodeViewHolder::class.java)
        tView.setDefaultAnimation(true)
        tView.setDefaultNodeClickListener { _, value ->
            if (value is Guide)
            {
                onItemSelected(value)
            }
        }
        leftLayout.addView(tView.view)
    }

    private fun setupSearch()
    {
        //start with the search bar disabled
        val searchManager = getSystemService(Context.SEARCH_SERVICE) as SearchManager

        searchView = findViewById<View>(R.id.search_view) as SearchView

        val info = searchManager.getSearchableInfo(componentName)
        searchView?.setSearchableInfo(info)

        searchView?.setIconifiedByDefault(true)

        //searchView.setEnabled(false);
        //searchView.setClickable(false);
        //searchView.setVisibility(View.INVISIBLE);


    }

    private fun addListItems(root: TreeNode, guide: Guide, level: Int)
    {
        for (kid in guide.children)
        {
            val n = TreeNode(kid)
            root.addChild(n)

            addListItems(n, kid, level+1)

        }
    }

    fun onItemSelected(item: Guide)
    {
        //if (!item.isLeaf)
        //    return

        val id = item.viewIdOrId

        if (id.isEmpty())
            return

        if (!item.hasChildren)
        {
            drawer?.closeDrawer(Gravity.LEFT)
        }

        if (id.startsWith("http") || item.hasGuideContent)
        {
            showGuideDetail(id, null, false, null)

        }
        else if (id.startsWith("Map"))
        {
            //start the map activity

            showMap(null, null);
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
    fun showGuideDetail(id: String?, singleNodeData: String?, history: Boolean, elementId: String?)
    {
        val args = HashMap<String, String>()
        if (id != null)
            args[GuideDetailFragment.ARG_ITEM_ID] = id

        if (elementId != null)
            args[GuideDetailFragment.ELEMENT_ID] = elementId

        if (singleNodeData != null)
            args[GuideDetailFragment.SINGLE_NODE_DATA] = singleNodeData

        showFragment(GuideDetailFragment::class.java, args, history, false)
    }

    fun showMap(singleNodeData: String?, viewId: String?)
    {
        val args = HashMap<String, String>()
        if (singleNodeData != null && viewId != null)
        {
            args[GuideDetailFragment.SINGLE_NODE_DATA] = singleNodeData
            args[GuideDetailFragment.ARG_ITEM_ID] = viewId
        }

        //instead of just creating a new one see if one exists
        //        Fragment fragment = getSupportFragmentManager().findFragmentById(R.id.map);
        //        if(fragment == null)
        showFragment(MapsFragment::class.java, args, true, false)
    }

    fun showFragment(fragmentClass: Class<*>, args: Map<String, String>?, includeInHistory: Boolean, leftPane: Boolean)
    {
        val arguments = Bundle()

        if (args != null)
        {
            for (key in args.keys)
            {
                arguments.putString(key, args[key])
            }
        }

        var fragment: androidx.fragment.app.Fragment? = null

        try
        {
            fragment = fragmentClass.newInstance() as androidx.fragment.app.Fragment
        }
        catch (e: Exception)
        {
            e.printStackTrace()
        }

        fragment?.arguments = arguments


        // In two-pane mode, show the detail view in this activity by
        // adding or replacing the detail fragment using a
        // fragment transaction.


        val container = R.id.guide_detail_container2

        /** TODO
         * if (leftPane)
         * {
         * container = R.id.guide_list;
         * } */

        if (fragment != null)
            addFragment(container, fragment, includeInHistory)

    }


    fun addFragment(fragmentId: Int, newFragment: androidx.fragment.app.Fragment, history: Boolean)
    {
        // Add the fragment to the activity, pushing this transaction
        // on to the back stack.
        val ft = supportFragmentManager.beginTransaction()
        //getFragmentManager().beginTransaction();
        ft.replace(fragmentId, newFragment)
        ft.setTransition(androidx.fragment.app.FragmentTransaction.TRANSIT_FRAGMENT_FADE)

        if (history)
            ft.addToBackStack(null)
        ft.commit()


        Log.d("Add Fragment", "Added")
    }

    fun addDoubleFragment(fragId1: Int, fragId2: Int, frag1: androidx.fragment.app.Fragment,
                          frag2: androidx.fragment.app.Fragment, history: Boolean)
    {
        val ft = supportFragmentManager.beginTransaction()
        //getFragmentManager().beginTransaction();
        ft.replace(fragId1, frag1)
        ft.setTransition(androidx.fragment.app.FragmentTransaction.TRANSIT_FRAGMENT_FADE)
        ft.replace(fragId2, frag2)
        ft.setTransition(androidx.fragment.app.FragmentTransaction.TRANSIT_FRAGMENT_FADE)

        if (history)
            ft.addToBackStack(null)
        ft.commit()


        Log.d("Add Fragment", "Double Added")
    }

    override fun onBackPressed()
    {
        val drawer = findViewById<View>(R.id.drawer_layout) as androidx.drawerlayout.widget.DrawerLayout
        if (drawer.isDrawerOpen(GravityCompat.START))
        {
            drawer.closeDrawer(GravityCompat.START)
        }
        else
        {
            super.onBackPressed()
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean
    {
        // Inflate the menu; this adds items to the action bar if it is present.
        menuInflater.inflate(R.menu.main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean
    {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        val id = item.itemId


        return if (id == R.id.action_settings)
        {
            true
        }
        else super.onOptionsItemSelected(item)

    }

    fun setProgress(complete: Long, total: Long, text: String)
    {
        Handler(Looper.getMainLooper()).post {
            if (progressBar != null && progressBarText != null)
            {
                progressBar?.max = total.toInt()
                progressBar?.progress = complete.toInt()
                progressBarText?.text = text

                val show = total > complete
                progressBar?.visibility = if (show) View.VISIBLE else View.GONE
                progressBarText?.visibility = if (show) View.VISIBLE else View.GONE
            }
        }

    }

    @JvmOverloads
    fun showSearchResult(uri: Uri)
    {
        Log.d("Search Result", uri.toString())

        val key = uri.lastPathSegment
        if (key != null)
        {
            val split = key.split(":")


            val viewId = split[0]
            var elementID: String? = null
            if (split.size > 1)
                elementID = split[1]

            Log.d("Search Result", "Selected view $viewId el $elementID")


            showGuideDetail(viewId, null, true, elementID)

        }
    }

    override fun onNewIntent(intent: Intent)
    {
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent): Boolean
    {
        val action = intent.action
        val uri = intent.data


        Log.d("New Intent", "New intent " + action!!)

        if (action == Intent.ACTION_SEARCH)
        {
            /* TODO - work this out - do we ever get it? Maybe pressing enter?
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
        }
        else if (action == Intent.ACTION_VIEW && uri != null)
        //probably shouldn't be something so generic, will need to be changed if ever end up using action view
        {
            Log.d("Quick Search Back", uri?.toString())

            val query = searchView?.query.toString()

            searchView?.isIconified = true //need to do this before the fragement transaction

            showSearchResult(uri)
            searchView?.isIconified = true

            return true
        }
        return false
    }

    companion object
    {

        private var instance: MainActivity? = null

        fun get(): MainActivity?
        {
            return instance
        }
    }

}
