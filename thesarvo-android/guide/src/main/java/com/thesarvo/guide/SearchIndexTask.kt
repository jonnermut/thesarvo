package com.thesarvo.guide

import android.util.Log

import com.google.common.base.Strings

import org.w3c.dom.Document
import org.w3c.dom.Element
import org.xml.sax.InputSource
import org.xml.sax.SAXException

import java.io.IOException
import java.io.InputStreamReader
import java.util.ArrayList

import javax.xml.parsers.DocumentBuilderFactory

/**
 * Created by jon on 28/12/2016.
 */
internal class SearchIndexTask(private val guideApplication: GuideApplication, viewId: String?) : Runnable
{

    private val indexManager: IndexManager
    private val resourceManager: ResourceManager
    var key = 1
    var viewId: String? = null

// FIXME
    //var views: Map<String, Model.ViewDef> = Model.get().getViews()
    //var guideListItems: Map<String, Model.ListItem> = Model.get().getGuideListItems()

    var factory = DocumentBuilderFactory.newInstance()


    init
    {
        this.resourceManager = guideApplication.resourceManager
        this.indexManager = guideApplication.indexManager
        this.viewId = viewId
    }

    override fun run()
    {
        //delete the old database first
        if (viewId == null)
        {
            indexManager.resetIndex()

        }
        //find all XML files
        //String[] allFiles;
        //AssetManager manager = guideApplication.getAssets();


        try
        {

            if (viewId == null)
            {

                //load all XML files

                for (vid in Model.get().guides.keys)
                {
                    this.viewId = vid
                    indexGuideXml(vid)
                }
            }
            else
            {
                indexGuideXml(viewId!!)
            }

        }
        catch (e: Throwable)
        {
            e.printStackTrace()

        }

        indexManager.saveIndex()
        Log.d("Search Index", "Indexing complete!")

    }

    @Throws(SAXException::class, IOException::class)
    private fun indexGuideXml(viewId: String)
    {
        try
        {
            val builder = factory.newDocumentBuilder()

            val item = Model.get().getGuide(viewId)
            if (item == null)
            {
                return
            }

            val stream = resourceManager.getDataAsset("$viewId.xml")

            if (stream == null || stream.available() == 0)
            {
                return;
            }

            indexListItem(viewId, item)

            // added to straighten out UTF-8 errors
            val reader = InputStreamReader(stream!!, "UTF-8")
            val source = InputSource(reader)

            val dom = builder.parse(source)
            val root = dom.documentElement
            //if there's no guide data continue
            if (root.tagName != "guide")
            {
                Log.d("Search Index", "$viewId not a guide")
                return
            }

            for (e in Xml.getElements(dom.getElementsByTagName("climb")))
            {
                indexClimbElement(viewId, item, e)
            }

            //do the same for boulder problems because teh Krauss
            for (e in Xml.getElements(dom.getElementsByTagName("problem")))
            {
                indexClimbElement(viewId, item, e)
            }

            for (e in Xml.getElements(dom.getElementsByTagName("text")))
            {
                indexTextElement(viewId, item, e)
            }


            indexGPSElements(viewId, dom)
        }
        catch (t: Throwable)
        {
            t.printStackTrace()
            Log.e("SearchIndexTask", "Unexpected error indexing " + viewId!!, t)
        }

    }

    private fun indexListItem(viewId: String, item: Guide?)
    {
        if (item == null)
            return

        //make index entry for view it's self
        val entry = IndexEntry()
        entry.viewId = viewId
        entry.text = item.title
        entry.key = viewId
        entry.type = IndexEntry.IndexType.VIEW


        addEntry(entry)
        //Log.d("Indexing", "adding " + entry.text);
    }

    private fun indexGPSElements(viewId: String, dom: Document)
    {
        var gpsNodes = indexManager?.index?.gpsPoints
        if (gpsNodes == null)
            return

        for (e in Xml.getElements(dom.getElementsByTagName("gps")))
        {
            val id = e.getAttribute("id")
            val points = ArrayList<Point>()

            for (ePoint in Xml.getElements(e.getElementsByTagName("point")))
            {
                val point = Point(ePoint)
                points.add(point)

            }


            //Log.d("Indexing", "adding gps node for " + item.getText());
            val gpsnode = GPSNode(viewId, id, points)
            indexManager.index?.gpsPoints?.add(gpsnode)

            addGPSEntry(gpsnode)


            //don't think an entry for the GPS is needed, not sure that that code is doing

        }
    }

    private fun indexTextElement(viewId: String, item: Guide, e: Element)
    {
        if (e.getAttribute("class").startsWith("h"))
        {
            val entry1 = IndexEntry()
            entry1.viewId = viewId
            entry1.viewName = item.title
            entry1.elementID = e.getAttribute("id")

            val text = e.textContent.trim { it <= ' ' }
            entry1.text = text
            entry1.subtext = entry1.viewName

            entry1.type = IndexEntry.IndexType.HEADING
            entry1.key = entry1.viewId + ":" + entry1.elementID

            //Log.d("Indexing", "adding heading " + text);

            addEntry(entry1)
        }
    }

    private fun indexClimbElement(viewId: String, item: Guide, e: Element)
    {
        val entry1 = IndexEntry()
        entry1.viewId = viewId
        entry1.viewName = item.title
        entry1.elementID = e.getAttribute("id")
        entry1.subtext = entry1.viewName

        val stars = e.getAttribute("stars")
        val grade = e.getAttribute("grade")
        val name = e.getAttribute("name")

        if (!Strings.isNullOrEmpty(name) || !Strings.isNullOrEmpty(grade))
        {
            var text = String.format("%s %s %s", stars, grade, name)
            text = text.trim { it <= ' ' }
            entry1.text = text

            entry1.type = IndexEntry.IndexType.CLIMB
            entry1.key = entry1.viewId + ":" + entry1.elementID


            addEntry(entry1)
        }
    }

    /**
     * helper to add an entry to the main table and the suggestions table
     */
    fun addEntry(entry: IndexEntry)
    {
        Log.d("Indexing", "adding entry " + entry.text)

        indexManager.index!!.index(entry)
    }

    fun addGPSEntry(node: GPSNode)
    {

        for (p in node.points)
        {
            /* FIXME
            ContentValues values = new ContentValues();
            values.put(IndexContentProvider.COL_GPS_ID, node.getId());
            values.put(IndexContentProvider.COL_LAT, p.getLatLng().latitude);
            values.put(IndexContentProvider.COL_LNG, p.getLatLng().longitude);
            values.put(IndexContentProvider.COL_DESC, p.getDescription());
            values.put(IndexContentProvider.COL_CODE, p.getCode());

            Uri.Builder builder = new Uri.Builder();
            builder.authority(IndexContentProvider.AUTHORITY);
            builder.scheme(ContentResolver.SCHEME_CONTENT);
            builder.path(IndexContentProvider.MAP_TABLE);

            guideApplication.getContentResolver().insert(builder.build(), values);
            */
        }
    }

    /*
    @Override
    protected void onProgressUpdate(Integer... progress)
    {

    }

    @Override
    protected void onPostExecute(Long result)
    {
        guideApplication.indexed = true;
        guideApplication.mapsIndexed = true;
        guideApplication.searchIndexed();
    }

    */

}
