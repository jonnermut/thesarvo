package com.thesarvo.guide

import android.app.Application
import android.os.Build

/**
 * Created by jon on 29/12/2016.
 */
class GuideApplication : Application()
{

    lateinit var resourceManager: ResourceManager


    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    private val mTwoPane: Boolean = false


    internal var indexed = false
    internal var mapsIndexed = false
    internal lateinit var indexManager: IndexManager

    override fun onCreate()
    {
        super.onCreate()
        instance = this

        resourceManager = ResourceManager(this)
        indexManager = IndexManager(this, resourceManager)
        indexManager.startup() // needs to be started before resource manager might start doing updates
        resourceManager.startup()

        Model.get().startup()

    }

    // callback from search index
    fun searchIndexed()
    {

    }

    companion object
    {
        private var instance: GuideApplication? = null

        var runningInRoboelectric = false

        private val DB_BUILD = "database build date"
        private val TESTER = 10000017
        private val SEARCH_PROJECTION = arrayOf("VIEW_ID", "ELEMENT_ID")

        fun get(): GuideApplication
        {
            return instance!!
        }

        //    public boolean isRunningInRoboelectric()
        //    {
        //        return runningInRoboelectric;
        //    }

        val isRunningInRoboelectric: Boolean
            get()
            {
                val finger = Build.FINGERPRINT
                return "robolectric" == finger
            }
    }
}
