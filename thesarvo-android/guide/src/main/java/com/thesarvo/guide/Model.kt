package com.thesarvo.guide

import com.fasterxml.jackson.databind.ObjectMapper
import org.w3c.dom.Element

import java.io.InputStream
import java.util.ArrayList
import java.util.LinkedHashMap

import javax.xml.parsers.DocumentBuilderFactory

/**
 * Created by jon on 25/01/14.
 */
class Model
{

    val excludePages: List<Long> = listOf(
            11370498, // Buy and download guides
            13467650, // Hardcopy Guides
            14450710, // Guide Manual
            330433081, // The Rookeries
            1147, //Additional Topos and Maps
            1148, // Articles
            1516, // Mt Wellington Guide Feedback
            2883716, // Mt Wellington Updates
            276267033, // Pipes Guide To Do
            9404496 // GPS

    // MAKE SURE YOU UPDATE THE SAME LIST in Model.swift !!!
    )

    var guides: MutableMap<String, Guide> = LinkedHashMap()

    //internal var guideListItems: MutableMap<String, ListItem> = LinkedHashMap()
    //var rootView: ViewDef? = null
    //    internal set

    lateinit var rootGuide: Guide

    inner class ViewDef(element: Element)
    {


        var id: String
            internal set
        var type: String
            internal set
        var name: String
            internal set
        var isRootView = false
            internal set
        internal var listItems: MutableList<ListItem> = ArrayList()


        init
        {
            this.id = element.getAttribute("id")
            this.type = element.getAttribute("type")
            this.name = element.getAttribute("name")
            this.isRootView = "true" == element.getAttribute("rootView")

            val data = Xml.getFirstElementByName(element, "data")
            if (data != null)
            {
                for (el in Xml.getElementsByName(data, "listItem"))
                {
                    listItems.add(ListItem(el))
                }
            }

        }

        fun getListItems(): List<ListItem>
        {
            return listItems
        }

        override fun toString(): String
        {
            return "ViewDef{" +
                    "id='" + id + '\''.toString() +
                    ", type='" + type + '\''.toString() +
                    ", name='" + name + '\''.toString() +
                    '}'.toString()
        }
    }


    inner class ListItem(element: Element)
    {


        var text: String
            internal set
        var viewId: String
            internal set
        var level = 1
            internal set

        var isLeaf = true

        init
        {
            text = element.getAttribute("text")
            viewId = element.getAttribute("viewId")

            val lev = element.getAttribute("level")
            if (lev != null && lev.length > 0)
                level = Integer.parseInt(lev)

        }

        override fun toString(): String
        {
            var ret = ""
            for (i in 1 until level)
                ret += "    "

            ret += text

            return ret
        }
    }

    fun startup()
    {

        val om = ObjectMapper()
        val stream = ResourceManager.get().getDataAsset("index.json")
        rootGuide = om.readValue(stream, Guide::class.java)

        val extraStream = ResourceManager.get().getWWWAsset("www/index-extra.json")
        val extras = om.readValue(extraStream, Guide::class.java)
        rootGuide.children.addAll(extras.children)


        process(rootGuide)
    }

    fun process(guide: Guide)
    {
        guides[guide.viewIdOrId] = guide

        if (guide.title.endsWith(" bouldering"))
        {
            guide.title = guide.title.removeSuffix(" bouldering")
        }
        if (guide.title == "The Tasmanian Bouldering Guide")
        {
            guide.title = "Bouldering"
        }

        guide.children = ArrayList<Guide>(
                guide.children.filter {
                    !excludePages.contains(it.id)
                    && !it.title.toLowerCase().contains("gallery")
            })


        for (c in guide.children)
        {
            process(c)
        }
    }


    init
    {


    }

    fun getGuide(id: String): Guide?
    {
        return guides.get(id)
    }


    companion object
    {

        private val instance = Model()

        fun get(): Model
        {
            return instance
        }
    }
}
