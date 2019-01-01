package com.thesarvo.guide


import org.apache.commons.io.FileUtils
import org.apache.commons.io.IOUtils
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.ObjectOutputStream

import org.junit.Assert.assertTrue

/**
 * Created by jon on 10/01/2017.
 */
@RunWith(RobolectricTestRunner::class)
//@Config(constants = BuildConfig::class, sdk = [27])
public class IndexRebuilder
{


    private var app: GuideApplication? = null

    @Before
    fun before() {
        app = GuideApplication.get()
        GuideApplication.runningInRoboelectric = true
    }


    /**
     * This 'test' rebuilds the index.ser file which is the cached search index.
     * It runs as a robo-electric test, for convenience and speed.
     */
    @Test
    @Throws(IOException::class)
    public fun testIndexAssetRebuild()
    {

        //ActivityController<MainActivity> activity = Robolectric.buildActivity(MainActivity.class);
        //activity.create();
        //File newIndexFile = new File(app.getApplicationInfo().dataDir + "/databases/index");
        val index = SearchIndexTask(app!!, null)
        index.run()


        val userDir = System.getProperty("user.dir") // should be /git/thesarvo/thesarvo-android/guide
        //File indexFile = new File(userDir + "/src/main/assets/databases/index");
        val serFile = File("$userDir/src/main/assets/index.ser")

        val newIndexFile = app!!.indexManager.indexFile
        if (newIndexFile.exists()) {
            serFile.delete()
            newIndexFile.renameTo(serFile)
        }


        /*
        Map<String, IndexEntry> map = index.getIndex();
        FileOutputStream fos = new FileOutputStream(serFile);
        ObjectOutputStream out = new ObjectOutputStream(fos);
        out.writeObject(map);
        out.close();
        fos.close();
        */
        /*
        String userDir = System.getProperty("user.dir"); // should be /git/thesarvo/thesarvo-android/guide
        File indexFile = new File(userDir + "/src/main/assets/databases/index");
        //assertTrue("Expected asset index file to exist at " + indexFile, indexFile.exists());

        newIndexFile = new File(app.getApplicationInfo().dataDir + "/databases/index");
        assertTrue("Expected new asset index file to exist at " + newIndexFile, newIndexFile.exists());

        // ok move the rebuilt index to the assets
        indexFile.delete();
        newIndexFile.renameTo(indexFile);

        assertTrue("Expected asset index file to exist at " + indexFile, indexFile.exists());
        */
    }

    companion object {
        init {
            GuideApplication.runningInRoboelectric = true
        }
    }

}
