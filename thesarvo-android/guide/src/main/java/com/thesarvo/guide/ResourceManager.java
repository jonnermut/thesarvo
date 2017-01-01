package com.thesarvo.guide;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Messenger;
import android.support.annotation.NonNull;
import android.util.Log;
import android.widget.Toast;

import com.android.vending.expansion.zipfile.APKExpansionSupport;
import com.android.vending.expansion.zipfile.ZipResourceFile;
import com.google.android.vending.expansion.downloader.DownloadProgressInfo;
import com.google.android.vending.expansion.downloader.DownloaderClientMarshaller;
import com.google.android.vending.expansion.downloader.DownloaderServiceMarshaller;
import com.google.android.vending.expansion.downloader.Helpers;
import com.google.android.vending.expansion.downloader.IDownloaderClient;
import com.google.android.vending.expansion.downloader.IDownloaderService;
import com.google.android.vending.expansion.downloader.IStub;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

/**
 * Created by jon on 28/12/2016.
 */

public class ResourceManager implements IDownloaderClient
{
    public static final String WWW_DATA = "www/data/";
    private final File dataDirectory;
    private GuideDownloader guideDownloader;
    GuideApplication guideApplication;
    private ZipResourceFile resources;
    boolean haveResources;

    private IStub downloaderStub;
    private IDownloaderService mRemoteService;

    private static final int EXP_VERSION_NO = 3;
    private static final long MAIN_EXP_FILE_SIZE = 191635456l;

    public ResourceManager(GuideApplication guideApplication)
    {
        this.guideApplication = guideApplication;
        this.dataDirectory = new File( guideApplication.getFilesDir(), "data");
        dataDirectory.mkdirs();

    }



    public void startup()
    {
        Context context = guideApplication;


        //TODO, use this to check for the existance of the file and then mount it as a virtual file system
        //we want to do this without communicating with the server if possible
        if (!expansionFilesDelivered(context, EXP_VERSION_NO))
        {
            Intent notifier = new Intent(context, GuideListActivity.class);
            notifier.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);

            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, notifier,
                    PendingIntent.FLAG_UPDATE_CURRENT);

            int downloading = -10;

            try
            {
                downloading = DownloaderClientMarshaller.startDownloadServiceIfRequired(context,
                        pendingIntent, AssetsDownloader.class);
            }
            catch (PackageManager.NameNotFoundException e)
            {
                e.printStackTrace();
            }

            if (downloading != DownloaderClientMarshaller.NO_DOWNLOAD_REQUIRED)
            {
                downloaderStub = DownloaderClientMarshaller.CreateStub(this, AssetsDownloader.class);

                // FIXME
                //GuideListActivity.get().setContentView(R.layout.downloader_ui);
                return;
            }

        }
        if (!haveResources)
        {
            try
            {
                resources = APKExpansionSupport.getAPKExpansionZipFile(context, EXP_VERSION_NO, 0);
            }
            catch (IOException e)
            {
                e.printStackTrace();
                Toast.makeText(guideApplication, "Error opening database!", Toast.LENGTH_LONG).show();
            }

            if (resources == null)
            {
                Toast.makeText(guideApplication, "Error opening data", Toast.LENGTH_LONG).show();
                Log.d("Main", "Error opening data");
            }
            else
            {

                haveResources = true;
            }
        }

        this.guideDownloader = new GuideDownloader(dataDirectory, this );

    }


    protected void resume(Context context)
    {
        if (null != downloaderStub)
        {
            downloaderStub.connect(context);
        }
    }

    protected void stop(Context context)
    {
        if (null != downloaderStub)
        {
            downloaderStub.disconnect(context);
        }

    }

    public InputStream getDataAsset(String file)
    {
        return getWWWAsset(WWW_DATA + file);
    }

    public InputStream getWWWAsset(String file)
    {
        Log.d("GuideListActivity", "getWWWAsset: " + file);

        if (resources == null)
        {
            Log.e("GuideListActivity", "Error getting asset, resources was null");
            return null;
        }

        long resourcesLastMod = getExpansionFileLastModified();

        // if we have downloaded a newer version, return that in preference to the resources zip
        if (file.startsWith(WWW_DATA))
        {
            File downloaded = new File(dataDirectory, file.substring(WWW_DATA.length()) );
            if (downloaded.exists() && downloaded.lastModified() > resourcesLastMod)
            {
                try
                {
                    return new FileInputStream(downloaded);
                }
                catch (FileNotFoundException e)
                {
                    Log.e("ResourceManager", "Inexplicably the file wasnt there", e);
                }
            }
        }

        InputStream stream = null;
        try
        {
            stream = resources.getInputStream(file);
        }
        catch (IOException e)
        {
            Log.e("GuideListActivity", "Error getting asset: " + file, e);
        }

        if (stream == null)
        {
            Log.e("GuideListActivity", "Could not find asset, returning null: " + file);
        }

        return stream;
    }

    //probably don't need anything this complex at this point
    //I don't even see the point of this when in step two we can use a lib to verify this anyway
    private boolean expansionFilesDelivered(Context context, int mainVersion)
    {
        File file = getExpansionFile(context, mainVersion);
        Log.d("GuideListActivity", "Checking EXAPK existence at " + file.toString());
        return file.exists();
        //return Helpers.doesFileExist(this, mainFile, MAIN_EXP_FILE_SIZE, false);
    }

    private long getExpansionFileLastModified()
    {
        File file = getExpansionFile(guideApplication, EXP_VERSION_NO);
        if (!file.exists())
            return 0L;
        return file.lastModified();
    }


    @NonNull
    private File getExpansionFile(Context context, int mainVersion)
    {
        String mainFile = Helpers.getExpansionAPKFileName(context, true, mainVersion);
        final String filename = Helpers.generateSaveFileName(context, mainFile);
        return new File(filename);
    }


    @Override
    public void onServiceConnected(Messenger m)
    {
        mRemoteService = DownloaderServiceMarshaller.CreateProxy(m);
        mRemoteService.onClientUpdated(downloaderStub.getMessenger());
    }

    @Override
    public void onDownloadStateChanged(int newState)
    {
        switch (newState)
        {
            case IDownloaderClient.STATE_COMPLETED:
                //restart the activity - won't do this...
                /*Intent intent = new Intent(this, GuideListActivity.class);
                intent.setAction(Intent.ACTION_MAIN);
                startActivity(intent);*/
                //guideApplication.finish();   //simply exit and let them reopen the app
                GuideListActivity.get().finish();
        }
    }

    @Override
    public void onDownloadProgress(DownloadProgressInfo progress)
    {
        GuideListActivity.get().onDownloadProgress(progress);
    }
}
