package com.thesarvo.guide;

import android.app.Application;

/**
 * Created by jon on 29/12/2016.
 */
public class GuideApplication extends Application
{
    private static GuideApplication instance;

    private ResourceManager resourceManager;
    private SearchIndex searchIndex;

    @Override
    public void onCreate()
    {
        super.onCreate();
        instance = this;

        resourceManager = new ResourceManager(this);
        resourceManager.startup();
        
        searchIndex = new SearchIndex(this);
        searchIndex.execute("test");
        
    }

    public static GuideApplication get()
    {
        return instance;
    }


    public ResourceManager getResourceManager()
    {
        return resourceManager;
    }

}
