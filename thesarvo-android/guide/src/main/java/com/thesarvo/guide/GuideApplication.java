package com.thesarvo.guide;

import android.app.Application;
import android.os.Build;

/**
 * Created by jon on 29/12/2016.
 */
public class GuideApplication extends Application
{
    private static GuideApplication instance;

    ResourceManager resourceManager;

    public static boolean runningInRoboelectric = false;

    private static final String DB_BUILD = "database build date";
    private static final int TESTER = 10000017;
    private static final String[] SEARCH_PROJECTION = {"VIEW_ID", "ELEMENT_ID"};


    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    private boolean mTwoPane;




    boolean indexed = false;
    boolean mapsIndexed = false;
    IndexManager indexManager;

    @Override
    public void onCreate()
    {
        super.onCreate();
        instance = this;

        resourceManager = new ResourceManager(this);
        indexManager = new IndexManager(this, resourceManager);
        indexManager.startup(); // needs to be started before resource manager might start doing updates
        resourceManager.startup();


    }

    public static GuideApplication get()
    {
        return instance;
    }


    public ResourceManager getResourceManager()
    {
        return resourceManager;
    }

    // callback from search index
    public void searchIndexed()
    {

    }

//    public boolean isRunningInRoboelectric()
//    {
//        return runningInRoboelectric;
//    }

    public static boolean isRunningInRoboelectric()
    {
        String finger = Build.FINGERPRINT;
        return "robolectric".equals(finger);
    }
}
