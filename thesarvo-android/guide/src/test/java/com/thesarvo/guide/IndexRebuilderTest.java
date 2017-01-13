package com.thesarvo.guide;


import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

import java.io.File;

import static org.junit.Assert.assertTrue;

/**
 * Created by jon on 10/01/2017.
 */
@RunWith(RobolectricTestRunner.class)
@Config(constants = BuildConfig.class, sdk = 21)
public class IndexRebuilderTest
{

    private GuideApplication app;

    @Before
    public void before()
    {
        app = GuideApplication.get();
        app.runningInRoboelectric = true;
    }


    @Test
    public void testIndexAssetRebuild()
    {

        //ActivityController<MainActivity> activity = Robolectric.buildActivity(MainActivity.class);
        //activity.create();

        SearchIndexTask index = new SearchIndexTask(app, app.resourceManager, null);
        index.run();

        String userDir = System.getProperty("user.dir"); // should be /git/thesarvo/thesarvo-android/guide
        File indexFile = new File(userDir + "/src/main/assets/databases/index");
        assertTrue("Expected asset index file to exist at " + indexFile, indexFile.exists());

        File newIndexFile = new File(app.getApplicationInfo().dataDir + "/databases/index");
        assertTrue("Expected new asset index file to exist at " + newIndexFile, newIndexFile.exists());

        // ok move the rebuilt index to the assets
        indexFile.delete();
        newIndexFile.renameTo(indexFile);

        assertTrue("Expected asset index file to exist at " + indexFile, indexFile.exists());
    }
    
}
