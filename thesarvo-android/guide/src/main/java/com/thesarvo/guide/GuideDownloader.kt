package com.thesarvo.guide


import android.util.Log
import com.google.common.collect.Iterables
import org.apache.commons.io.FileUtils
import org.apache.commons.io.IOUtils
import org.w3c.dom.Document
import org.w3c.dom.Element
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.*
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import javax.xml.parsers.DocumentBuilder
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.parsers.ParserConfigurationException
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult

/**
 * Created by jon on 28/12/2016.
 */

class GuideDownloader(directory: File, private val resourceManager: ResourceManager)
{
    private var queuedDownloads: MutableList<Update>? = null

    internal var since: Long = 0

    internal var directory: File? = null

    internal var completedOps = 0
    internal var totalOps = 0


    internal var queue: Executor = Executors.newSingleThreadExecutor()

    internal var updates = Updates(null)

    internal val isSyncing: Boolean
        get() = completedOps < totalOps && totalOps > 0

    internal val updatesFilePath: File
        get() = getFinalPath("updates.xml")

    internal inner class Update(var element: Element)
    {

        val url: String
            get() = element.getAttribute("url")

        val filename: String?
            get() = element.getAttribute("filename")

        val lastModified: String
            get() = element.getAttribute("lastModified")

    }

    internal inner class Updates(`stream`: InputStream?)
    {
        lateinit var document: Document

        private val documentBuilder: DocumentBuilder?
            get()
            {
                try
                {
                    return DocumentBuilderFactory.newInstance().newDocumentBuilder()
                }
                catch (e: ParserConfigurationException)
                {
                    e.printStackTrace()
                }

                return null
            }


        var maxLastMod: Long?
            get()
            {
                val `val` = document.documentElement.getAttribute("maxLastMod")
                return if (`val` != null && `val`.length > 0)
                {
                    java.lang.Long.parseLong(`val`)
                }
                else null
            }
            set(lastMod) = document.documentElement.setAttribute("maxLastMod", lastMod!!.toString())

        var indexHash: String?
            get()
            {
                return document.documentElement.getAttribute("indexHash")
            }
            set(newVal) = document.documentElement.setAttribute("indexHash", newVal)


        val updates: MutableList<Update>
            get()
            {
                val nl = document.documentElement.getElementsByTagName("update")
                val ret = ArrayList<Update>(nl.length)

                for (i in 0 until nl.length)
                {
                    val n = nl.item(i)
                    if (n is Element)
                    {
                        ret.add(Update(n))
                    }
                }
                return ret
            }

        init
        {
            if (`stream` != null)
            {
                try
                {
                    document = documentBuilder!!.parse(`stream`)


                }
                catch (e: Exception)
                {
                    e.printStackTrace()
                }
                finally
                {
                    IOUtils.closeQuietly(stream)
                }


            }
            else
            {
                // create default empty

                document = documentBuilder!!.newDocument()
                document.appendChild(document.createElement("updates"))
            }
        }

        fun save()
        {
            val file = this@GuideDownloader.updatesFilePath

            try
            {
                val transformer = TransformerFactory.newInstance().newTransformer()
                val result = StreamResult(file)
                val source = DOMSource(document)
                transformer.transform(source, result)
            }
            catch (e: Exception)
            {
                Log.e("GuideDownloader", "Unexpected error saving updates.xml", e)
            }

        }

        fun addUpdate(update: Update)
        {
            val newOne = this.document.createElement("update")
            newOne.setAttribute("url", update.url)
            newOne.setAttribute("filename", update.filename)
            newOne.setAttribute("lastModified", update.lastModified)
            document.documentElement.appendChild(newOne)

        }
    }

    init
    {
        this.directory = directory

        queue.execute {
            // load the existing file

            val updateFile = updatesFilePath
            if (updateFile.exists())
            {
                try
                {
                    this.updates = Updates(FileInputStream(updateFile))
                }
                catch (e: FileNotFoundException)
                {
                    e.printStackTrace()
                }

            }

            // check if we have a newer resource updates.xml than our local one
            maybeCopyResourceUpdatesXml()

            queue.execute { this.startSync() }
        }

    }

    private fun maybeCopyResourceUpdatesXml()
    {
        val resourceUpdatesXml = resourceManager.getDataAsset("updates.xml")
        if (resourceUpdatesXml != null)
        {
            val resourceUpdates = Updates(resourceUpdatesXml)
            val lastMod = resourceUpdates.maxLastMod
            if (lastMod != null)
            {
                if (updates.maxLastMod == null || updates.maxLastMod!! < lastMod)
                {
                    updates.maxLastMod = lastMod
                    updates.save()
                }
            }
        }
    }

    private fun getFinalPath(filename: String?): File
    {
        return File(directory, filename!!).absoluteFile
    }

    private fun startSync()
    {
        if (isSyncing)
        {
            Log.d("GuideDownloader", "Already syncing, not starting again")
            return
        }

        try
        {


            this.completedOps = 0
            this.totalOps = 1
            getUpdatesList()

            updateProgress(null)
            queue.execute { this.downloadFirst() }
        }
        catch (t: Throwable)
        {
            Log.e("GuideDownloader", "Error getting updates list", t)

        }

        incrementCompleted()
    }

    private fun getUpdatesList()
    {
        updateProgress("Getting updates")

        var s = this.updates.maxLastMod
        if (s == null)
            s = 0L

        val surl = SYNC_URL + s.toString()
        val url = URL(surl)

        val conn = url.openConnection() as HttpURLConnection
        val `in` = BufferedInputStream(conn.inputStream)
        val newUpdates = Updates(`in`)
        processNewUpdates(newUpdates)

        this.queuedDownloads = this.updates.updates
        this.totalOps += this.queuedDownloads?.size ?: 0
    }



    private fun incrementCompleted()
    {
        completedOps++
        updateProgress(null)
    }

    private fun updateProgress(text: String?)
    {
        var txt = text
        if (txt == null)
        {
            txt = """Updated ${completedOps} of $totalOps"""
        }

        val mainActivity = MainActivity.get()
        mainActivity?.setProgress(completedOps.toLong(), totalOps.toLong(), txt)
    }


    /**
     * Attempt to download the head of the queue
     */
    private fun downloadFirst()
    {
        val queuedDownloads = this.queuedDownloads
        if (queuedDownloads == null || queuedDownloads.isEmpty())
            return

        // pop the top of the queue
        val u = queuedDownloads[0]
        queuedDownloads.removeAt(0)
        val finalPath = getFinalPath(u.filename)
        val surl = u.url


        try
        {
            downloadUrl(surl, finalPath)

            // remove from our list
            u.element.parentNode.removeChild(u.element)
            updates.save()

            // queue an index task
            if (u.filename?.endsWith(".xml") == true)
            {
                val viewId = "guide." + u.filename!!.replace(".xml", "")
                val task = SearchIndexTask(GuideApplication.get(), viewId)

                queue.execute(task)
            }
        }
        catch (t: Throwable)
        {
            Log.e("GuideDownloader", "Error downloading file: " + u.url, t)
        }

        incrementCompleted()

        if (queuedDownloads.size > 0)
        {
            queue.execute { this.downloadFirst() }
        }
    }

    private fun incrementTotal()
    {
        totalOps++
        updateProgress(null)
    }

    @Throws(IOException::class)
    private fun downloadUrl(surl: String, finalPath: File)
    {
        val url = URL(surl)

        val conn = url.openConnection() as HttpURLConnection

        val tempFile = File(GuideApplication.get().cacheDir, UUID.randomUUID().toString())

        val stream = BufferedInputStream(conn.inputStream)
        stream.use {
            FileUtils.copyInputStreamToFile(stream, tempFile)
        }
        conn.disconnect()

        // atomically move into place

        if (finalPath.exists())
            finalPath.delete()
        tempFile.renameTo(finalPath)
    }

    private fun processNewUpdates(newUpdates: Updates)
    {
        val existing = ArrayList(this.updates.updates)
        for (update in newUpdates.updates)
        {
            val f = update.filename
            if (f != null)
            {
                if (!Iterables.any(existing) { u -> f == u?.filename })
                {
                    // no match, add it
                    this.updates.addUpdate(update)
                }
            }

        }
        this.updates.maxLastMod = newUpdates.maxLastMod
        this.updates.save()

        maybeDownloadIndexJson(newUpdates)
    }

    private fun maybeDownloadIndexJson(newUpdates: Updates)
    {
        val newHash = newUpdates.indexHash
        val existingHash = updates.indexHash
        if (newHash != null
                && newHash.isNotEmpty()
                && existingHash != newHash)
        {
            incrementTotal()

            val finalPath = getFinalPath("index.json")

            try
            {
                downloadUrl(INDEX_URL, finalPath)
                updates.indexHash = newHash
                updates.save()
            }
            catch (t: Throwable)
            {
                Log.e("GuideDownloader", "Error downloading index file", t)
            }
            finally
            {
                incrementCompleted()
            }
        }

    }

    companion object
    {

        internal var BASE_URL = "http://www.thesarvo.com/confluence"
        internal var SYNC_URL = "$BASE_URL/plugins/servlet/guide/sync/"
        internal var INDEX_URL = "$BASE_URL/plugins/servlet/guide/index/1"
    }

}
