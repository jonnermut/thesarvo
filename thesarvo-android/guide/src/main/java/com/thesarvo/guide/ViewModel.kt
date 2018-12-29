package com.thesarvo.guide

import org.w3c.dom.Document
import org.w3c.dom.Element

import java.io.InputStream
import java.util.ArrayList
import java.util.LinkedHashMap

import javax.xml.parsers.DocumentBuilder
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Created by jon on 25/01/14.
 */
class ViewModel @JvmOverloads constructor(inputStream: InputStream = ViewModel::class.java.getResourceAsStream("/config.xml")) {


    internal var views: MutableMap<String, ViewDef> = LinkedHashMap()
    internal var guideListItems: MutableMap<String, ListItem> = LinkedHashMap()
    var rootView: ViewDef? = null
        internal set

    inner class ViewDef(element: Element) {


        var id: String
            internal set
        var type: String
            internal set
        var name: String
            internal set
        var isRootView = false
            internal set
        internal var listItems: MutableList<ListItem> = ArrayList()


        init {
            this.id = element.getAttribute("id")
            this.type = element.getAttribute("type")
            this.name = element.getAttribute("name")
            this.isRootView = "true" == element.getAttribute("rootView")

            val data = Xml.getFirstElementByName(element, "data")
            if (data != null) {
                for (el in Xml.getElementsByName(data, "listItem")) {
                    listItems.add(ListItem(el))
                }
            }

        }

        fun getListItems(): List<ListItem> {
            return listItems
        }

        override fun toString(): String {
            return "ViewDef{" +
                    "id='" + id + '\''.toString() +
                    ", type='" + type + '\''.toString() +
                    ", name='" + name + '\''.toString() +
                    '}'.toString()
        }
    }


    inner class ListItem(element: Element) {


        var text: String
            internal set
        var viewId: String
            internal set
        var level = 1
            internal set

        var isLeaf = true

        init {
            text = element.getAttribute("text")
            viewId = element.getAttribute("viewId")

            val lev = element.getAttribute("level")
            if (lev != null && lev.length > 0)
                level = Integer.parseInt(lev)

        }

        override fun toString(): String {
            var ret = ""
            for (i in 1 until level)
                ret += "    "

            ret += text

            return ret
        }
    }

    init {


        try {
            val factory = DocumentBuilderFactory.newInstance()

            val builder = factory.newDocumentBuilder()
            val dom = builder.parse(inputStream)
            val root = dom.documentElement

            for (element in Xml.getElementsByName(root, "view")) {
                val v = ViewDef(element)
                views[v.id] = v

                if (v.isRootView)
                    rootView = v
            }

            for (element1 in Xml.getElements(dom.getElementsByTagName("listItem"))) {
                val l = ListItem(element1)

                if (l.viewId.startsWith("guide.")) {
                    guideListItems[l.viewId] = l
                }
            }


        } catch (t: Throwable) {
            t.printStackTrace()
        }

    }

    fun getViews(): Map<String, ViewDef> {
        return views
    }

    fun getGuideListItems(): Map<String, ListItem> {
        return guideListItems
    }

    companion object {

        private val instance = ViewModel()

        fun get(): ViewModel {
            return instance
        }
    }
}
