package com.thesarvo.guide

import java.io.Serializable
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Created by jon on 5/9/17.
 */

class Index : Serializable
{

    //public long assetLastMod;

    val indexEntries = ConcurrentHashMap<String, IndexEntry>()

    val gpsPoints: MutableList<GPSNode> = ArrayList()

    fun index(entry: IndexEntry)
    {

        if (entry.searchText == null)
        {
            var t: String? = entry.text
            if (t == null)
                t = entry.viewName
            if (t != null)
                entry.searchText = t.lowercase(Locale.getDefault()).trim { it <= ' ' }
        }
        val key = entry.key

        if (key != null)
        {


            synchronized(this) {
                indexEntries.put(key, entry)
            }
        }

    }

    fun search(selection: String?): List<IndexEntry>
    {
        val ret = ArrayList<IndexEntry>()

        if (selection == null || selection.length < 2)
        {
            return ret
        }

        synchronized(this) {
            for ((key, ie) in indexEntries)
            {
                val searchText = ie.searchText
                if (searchText != null && searchText.contains(selection))
                {
                    ret.add(ie)
                    if (ret.size > 50)
                    {
                        return ret
                    }
                }
            }
        }
        return ret
    }

    companion object
    {
        private const val serialVersionUID: Long = 1
    }
}
