package com.thesarvo.guide

import android.util.Log
import org.apache.commons.io.FileUtils
import org.apache.commons.io.IOUtils
import java.io.*

/**
 * Created by jon on 28/12/2016.
 */
internal class IndexManager(private val guideApplication: GuideApplication, private val resourceManager: ResourceManager)
{

    private val indexDir: File
    private val indexTimestamp: File
    val indexFile: File

    var index: Index? = null


    init
    {
        this.indexDir = File(guideApplication.filesDir, "index")
        indexDir.mkdirs()
        this.indexFile = File(indexDir, "index.ser")
        this.indexTimestamp = File(indexDir, "index.timestamp")

    }

    fun startup()
    {

        loadIndex()
    }


    private fun loadIndex()
    {
        val assetLastMod = BuildConfig.DB_ASSET_LASTMOD
        var copyFromAsset = true

        if (indexFile.exists() && indexTimestamp.exists())
        {
            try
            {
                val timestamp = FileUtils.readFileToString(indexTimestamp, Charsets.UTF_8)
                val ts = java.lang.Long.parseLong(timestamp)
                copyFromAsset = assetLastMod > ts

            }
            catch (e: Exception)
            {
                e.printStackTrace()
            }

        }

        if (copyFromAsset)
        {

            try
            {
                val stream = guideApplication.assets.open("index.ser")
                stream.use {
                    IOUtils.copy(stream, FileOutputStream(indexFile))
                }

                FileUtils.writeStringToFile(indexTimestamp, "" + assetLastMod, Charsets.UTF_8)
            }
            catch (e: IOException)
            {
                e.printStackTrace()
            }

        }

        synchronized(this) {
            if (indexFile.exists())
            {
                var ois: ObjectInputStream? = null
                try
                {
                    ois = ObjectInputStream(FileInputStream(indexFile))
                    this.index = ois.readObject() as Index

                }
                catch (e: Exception)
                {
                    e.printStackTrace()
                }
                finally
                {
                    IOUtils.closeQuietly(ois)
                }
            }
            else
            {
                Log.w("thesarvo", "Index file did not exist at $indexFile")
            }
        }
    }

    fun saveIndex()
    {
        var fos: FileOutputStream? = null
        var out: ObjectOutputStream? = null
        synchronized(this) {
            try
            {
                fos = FileOutputStream(indexFile)
                out = ObjectOutputStream(fos)
                out!!.writeObject(index)

            }
            catch (e: Exception)
            {
                e.printStackTrace()
            }
            finally
            {
                IOUtils.closeQuietly(out)
                IOUtils.closeQuietly(fos)
            }

        }
    }

    fun resetIndex()
    {
        synchronized(this) {
            index = Index()
        }
    }
}