package com.thesarvo.guide;

import android.util.Log;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

/**
 * Created by jon on 28/12/2016.
 */
class IndexManager
{

    private final File indexDir;
    private final File indexTimestamp;
    public final File indexFile;
    private GuideApplication guideApplication;
    private ResourceManager resourceManager;

    Index index = null;


    public IndexManager(GuideApplication guideApplication, ResourceManager resourceManager)
    {
        this.guideApplication = guideApplication;
        this.resourceManager = resourceManager;
        this.indexDir = new File( guideApplication.getFilesDir(), "index");
        indexDir.mkdirs();
        this.indexFile = new File(indexDir, "index.ser");
        this.indexTimestamp = new File(indexDir, "index.timestamp");

    }

    public Index getIndex()
    {
        return index;
    }

    public void startup()
    {

        loadIndex();
    }



    private void loadIndex()
    {
        long assetLastMod = BuildConfig.DB_ASSET_LASTMOD;
        boolean copyFromAsset = true;

        if (indexFile.exists() && indexTimestamp.exists())
        {
            try
            {
                String timestamp = FileUtils.readFileToString(indexTimestamp);
                long ts = Long.parseLong(timestamp);
                copyFromAsset = assetLastMod > ts;

            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
        }

        if (copyFromAsset)
        {
            InputStream is = null;
            try
            {
                is = guideApplication.getAssets().open("index.ser");
                IOUtils.copy(is, new FileOutputStream(indexFile));
                IOUtils.closeQuietly(is);

                FileUtils.writeStringToFile(indexTimestamp, "" + assetLastMod);
            }
            catch (IOException e)
            {
                e.printStackTrace();
            }

        }

        synchronized (this)
        {
            if (indexFile.exists())
            {
                ObjectInputStream ois = null;
                try
                {
                    ois = new ObjectInputStream(new FileInputStream(indexFile));
                    this.index = (Index) ois.readObject();

                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
                finally
                {
                    IOUtils.closeQuietly(ois);
                }
            }
            else
            {
                Log.w("thesarvo","Index file did not exist at " + indexFile);
            }
        }
    }

    void saveIndex()
    {
        FileOutputStream fos = null;
        ObjectOutputStream out = null;
        synchronized (this)
        {
            try
            {
                fos = new FileOutputStream(indexFile);
                out = new ObjectOutputStream(fos);
                out.writeObject(index);

            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
            finally
            {
                IOUtils.closeQuietly(out);
                IOUtils.closeQuietly(fos);
            }

        }
    }

    public void resetIndex()
    {
        synchronized (this)
        {
            index = new Index();
        }
    }
}