package com.thesarvo.guide

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Messenger
import android.util.Log
import android.widget.Toast
import com.android.vending.expansion.zipfile.APKExpansionSupport
import com.android.vending.expansion.zipfile.ZipResourceFile
import com.google.android.vending.expansion.downloader.*
import java.io.*

/**
 * Created by jon on 28/12/2016.
 */

class ResourceManager(internal var guideApplication: GuideApplication) : IDownloaderClient
{
    private val dataDirectory: File
    private var guideDownloader: GuideDownloader? = null
    private var resources: ZipResourceFile? = null
    internal var haveResources: Boolean = false

    private var downloaderStub: IStub? = null
    private var mRemoteService: IDownloaderService? = null

    private val expansionFileLastModified: Long
        get()
        {
            val file = getExpansionFile(guideApplication, EXP_VERSION_NO)
            return if (!file.exists()) 0L else file.lastModified()
        }

    init
    {
        this.dataDirectory = File(guideApplication.filesDir, "data")
        dataDirectory.mkdirs()

    }


    fun startup()
    {
        val context = guideApplication


        //TODO, use this to check for the existance of the file and then mount it as a virtual file system
        //we want to do this without communicating with the server if possible

        if (GuideApplication.isRunningInRoboelectric)
        {
            haveResources = true
        }
        else if (!expansionFilesDelivered(context, EXP_VERSION_NO))
        {
            val notifier = Intent(context, MainActivity::class.java)
            notifier.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            //Intent notifier = null;

            val pendingIntent = PendingIntent.getActivity(context, 0, notifier,
                    PendingIntent.FLAG_UPDATE_CURRENT)

            var downloading = -10

            try
            {
                downloading = DownloaderClientMarshaller.startDownloadServiceIfRequired(context,
                        pendingIntent, AssetsDownloader::class.java)
            }
            catch (e: PackageManager.NameNotFoundException)
            {
                e.printStackTrace()
            }

            if (downloading != DownloaderClientMarshaller.NO_DOWNLOAD_REQUIRED)
            {
                downloaderStub = DownloaderClientMarshaller.CreateStub(this, AssetsDownloader::class.java)
                downloaderStub!!.connect(context)
                // FIXME
                //GuideListActivity.get().setContentView(R.layout.downloader_ui);
                return
            }

        }
        if (!haveResources)
        {
            try
            {
                resources = APKExpansionSupport.getAPKExpansionZipFile(context, EXP_VERSION_NO, 0)
            }
            catch (e: IOException)
            {
                e.printStackTrace()
                Toast.makeText(guideApplication, "Error opening extension file!", Toast.LENGTH_LONG).show()
            }

            if (resources == null)
            {
                Toast.makeText(guideApplication, "Error opening data", Toast.LENGTH_LONG).show()
                Log.d("Main", "Error opening data")
            }
            else
            {

                haveResources = true
            }
        }

        this.guideDownloader = GuideDownloader(dataDirectory, this)

    }


    protected fun resume(context: Context)
    {
        if (null != downloaderStub)
        {
            downloaderStub!!.connect(context)
        }
    }

    protected fun stop(context: Context)
    {
        if (null != downloaderStub)
        {
            downloaderStub!!.disconnect(context)
        }

    }

    fun getDataAsset(file: String): InputStream?
    {
        return getWWWAsset(WWW_DATA + file)
    }

    fun getWWWAsset(file: String): InputStream?
    {
        Log.d("GuideListActivity", "getWWWAsset: $file")

        if (GuideApplication.isRunningInRoboelectric)
        {
            // try files on disk first
            val userDir = System.getProperty("user.dir") // should be /git/thesarvo/thesarvo-android/guide
            val downloadDir = File("$userDir/../../thesarvo_iphone_2.0/thesarvo")
            if (downloadDir.exists())
            {
                val downloadFile = File(downloadDir, file)
                try
                {
                    return FileInputStream(downloadFile)
                }
                catch (e: FileNotFoundException)
                {
                    Log.e("ResourceManager", "Expected file in downloads, it wasnt: $downloadFile", e)
                }

            }
        }

        if (resources == null)
        {
            Log.e("GuideListActivity", "Error getting asset, resources was null")
            return null
        }

        val resourcesLastMod = expansionFileLastModified

        // if we have downloaded a newer version, return that in preference to the resources zip
        if (file.startsWith(WWW_DATA))
        {
            val downloaded = File(dataDirectory, file.substring(WWW_DATA.length))
            if (downloaded.exists() && downloaded.lastModified() > resourcesLastMod)
            {
                try
                {
                    return FileInputStream(downloaded)
                }
                catch (e: FileNotFoundException)
                {
                    Log.e("ResourceManager", "Inexplicably the file wasnt there", e)
                }

            }
        }

        var stream: InputStream? = null
        try
        {
            stream = resources!!.getInputStream(file)
        }
        catch (e: IOException)
        {
            Log.e("GuideListActivity", "Error getting asset: $file", e)
        }

        if (stream == null)
        {
            Log.e("GuideListActivity", "Could not find asset, returning null: $file")
        }

        return stream
    }

    //probably don't need anything this complex at this point
    //I don't even see the point of this when in step two we can use a lib to verify this anyway
    private fun expansionFilesDelivered(context: Context, mainVersion: Int): Boolean
    {
        val file = getExpansionFile(context, mainVersion)
        Log.d("GuideListActivity", "Checking EXAPK existence at " + file.toString())
        return file.exists()
        //return Helpers.doesFileExist(this, mainFile, MAIN_EXP_FILE_SIZE, false);
    }


    private fun getExpansionFile(context: Context, mainVersion: Int): File
    {
        val mainFile = Helpers.getExpansionAPKFileName(context, true, mainVersion)
        val filename = Helpers.generateSaveFileName(context, mainFile)
        return File(filename)
    }


    override fun onServiceConnected(m: Messenger)
    {
        mRemoteService = DownloaderServiceMarshaller.CreateProxy(m)
        mRemoteService!!.onClientUpdated(downloaderStub!!.messenger)
    }

    override fun onDownloadStateChanged(newState: Int)
    {
        when (newState)
        {
            IDownloaderClient.STATE_COMPLETED -> MainActivity.get()!!.setProgress(0, 0, "Finished")
        }
    }

    override fun onDownloadProgress(progress: DownloadProgressInfo)
    {
        MainActivity.get()?.setProgress(progress.mOverallProgress shr 8, progress.mOverallTotal shr 8, "Downloading Data")
    }

    companion object
    {
        val WWW_DATA = "www/data/"

        private val EXP_VERSION_NO = 3
        private val MAIN_EXP_FILE_SIZE = 191635456L

        fun get(): ResourceManager
        {
            return GuideApplication.get().resourceManager
        }

    }
}
