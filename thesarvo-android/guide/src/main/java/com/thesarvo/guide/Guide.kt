package com.thesarvo.guide

import org.apache.commons.io.IOUtils

public class Guide
{
    companion object {

    }

    val id: Long
    var title: String = ""
    var children: MutableList<Guide> = ArrayList<Guide>()
    var viewId: String? = null
    var level: Int? = 1
    var url: String? = null
    val viewIdOrId: String
        get() = viewId ?: "${id}"

    constructor()
    {
        id = -1
    }

    constructor(id: Long)
    {
        this.id = id
    }
    
    constructor(viewId: String, title: String, children: MutableList<Guide> ) {
        this.id = -1
        this.title = title
        this.viewId = viewId
        this.children = children
    }

    public val hasChildren: Boolean
        get() = this.children.isNotEmpty()


    private var _data: String? = null

    val data: String?
        get()
        {
            if (_data == null)
            {

                val filename = "$id.xml"
                val stream = ResourceManager.get().getDataAsset(filename)
                if (stream != null)
                {
                    _data = IOUtils.toString(stream, Charsets.UTF_8)
                }
            }
            return _data
        }

    val hasGuideContent: Boolean
        get() = this.data != null



    /*
    val data: Data? by lazy { this.loadData() }
    
    fun loadData() : Data? =
        Guide.loadData(name = "${id}", fileExtension = "xml")
    public val isGuide: Boolean
        get() = viewId == null


    
    fun loadDataAsString() : String? {
        val d = data
        if (d != null) {
            return String(data = d, encoding = String.Encoding.utf8)
        }
        return null
    }
    val guideElement: GuideElement? by lazy this.loadGuideElement
    
    fun loadGuideElement() : GuideElement? {
        val data = this.data
        if (data != null) {
            // parse the guide...
            val doc = try { GuideDocument(xmlData = data) } catch (e: Throwable) { null }
            if (doc != null) {
                return doc["guide"] as? GuideElement
            }
        }
        return null
    }
    
    fun getImageUrls() : Dictionary<String, String> {
        val ret = Model.instance.guideDownloader.getUrls("${this.id}")
        return ret
    }
    
    fun getHeadings() : List<TextNode> {
        val texts = guideElement?.childrenWithName("text") as! List<TextNode>
        return texts.filter({ it.heading })
    }
    val headings: List<TextNode> by lazy this.getHeadings
    
    fun getHeadingsAndClimbs() : Array<GuideNode> {
        var filtered = Array<GuideNode>()
        val kids = guideElement?.children
        if (kids != null) {
            for (node in kids) {
                val text = node as? TextNode
                if (text != null) {
                    if (text.heading) {
                        filtered.append(text)
                    }
                } else val climb = node as? ClimbNode
                if (climb != null) {
                    filtered.append(climb)
                } else val header = node as? HeaderNode
                if (header != null) {
                    filtered.append(header)
                } else val header = node as? GpsNode
                if (header != null) {
                    filtered.append(header)
                }
            }
        }
        return filtered
    }
    */
}


