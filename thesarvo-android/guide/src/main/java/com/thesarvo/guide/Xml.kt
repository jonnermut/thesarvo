package com.thesarvo.guide

import org.w3c.dom.Element
import org.w3c.dom.NodeList

import java.util.ArrayList

/**
 * Created by jon on 25/01/14.
 */
object Xml {
    fun getFirstElementByName(parent: Element, tag: String): Element? {
        val els = getElementsByName(parent, tag)
        return if (els.size > 0)
            els[0]
        else
            null
    }


    fun getElementsByName(parent: Element, tag: String): List<Element> {
        val nl = parent.getElementsByTagName(tag)
        return getElements(nl)
    }

    fun getElements(nodeList: NodeList): List<Element> {
        val ret = ArrayList<Element>(nodeList.length)
        for (i in 0 until nodeList.length) {
            ret.add(nodeList.item(i) as Element)
        }
        return ret
    }


}
