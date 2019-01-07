package com.thesarvo.guide

import android.database.MatrixCursor
import java.io.Serializable

/**
 * Created by Karl on 4/09/2014.
 */
class IndexEntry : Serializable
{

    var key: String? = null
    var viewId: String
    var viewName: String
    var elementID: String
    var text: String
    var subtext = ""
    var searchText: String? = null

    var type: IndexType

    enum class IndexType : Serializable
    {
        CLIMB,
        PROBLEM,
        HEADING,
        MENU_ITEM,
        VIEW,
        NUM_INDEX_TYPE,
        INDEX_TYPE_INVALID


    }

    init
    {
        viewId = ""
        viewName = ""
        elementID = ""
        text = ""
        type = IndexType.INDEX_TYPE_INVALID
    }

    override fun toString(): String
    {
        return "IndexEntry{" +
                "viewId='" + viewId + '\''.toString() +
                ", viewName='" + viewName + '\''.toString() +
                ", elementID='" + elementID + '\''.toString() +
                ", text='" + text + '\''.toString() +
                '}'.toString()
    }

    fun toMatrixCursor(): MatrixCursor
    {
        val cursor = MatrixCursor(INDEX_ENTRY_COLUMNS)

        val columnValues = arrayOf(Integer.valueOf(key), viewId, viewName, elementID, text, type)
        cursor.addRow(columnValues)

        return cursor
    }

    companion object
    {
        private const val serialVersionUID: Long = 1

        val INDEX_ENTRY_COLUMNS = arrayOf("_ID", "viewId", "viewName", "elementID", "text", "type")
    }
}
