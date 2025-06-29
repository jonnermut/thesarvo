package com.thesarvo.guide

import android.app.SearchManager
import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import java.util.Locale

//import com.thesarvo.guide.IndexEntry.INDEX_ENTRY_COLUMNS

/**
 * Created by Karl on 5/09/2014.
 *
 * URI provider = com.thesarvo.guide.provider
 * main table = main
 * suggesions table = suggestions
 *
 *
 * Contract class not needed as this isn't intended to be used by other apps
 *
 * TODO needs to be a way to re-index in app via options etc
 */
class IndexContentProvider : ContentProvider()
{

    var id: Int = 0

    override fun onCreate(): Boolean
    {
        return true
    }

    public override fun query(uri: Uri,
                              projection: Array<String>?,
                              selection: String?,
                              selectionArgs: Array<String>?,
                              sortOrder: String?): Cursor?
    {
        var selection = selection
        if (uri.toString().contains("/search_suggest_query/"))
        {
            selection = uri.getLastPathSegment()!!.lowercase(Locale.getDefault())

            val results = GuideApplication.get().indexManager.index?.search(selection)
            val columns = arrayOf<String>("_id", SearchManager.SUGGEST_COLUMN_TEXT_1, SearchManager.SUGGEST_COLUMN_TEXT_2, SearchManager.SUGGEST_COLUMN_INTENT_DATA_ID)

            val cursor = MatrixCursor(columns)

            if (results != null)
            {
                for (ie in results)
                {
                    val columnValues = arrayOf<Any>(id++, ie.text, ie.subtext, ie.key ?: "")
                    cursor.addRow(columnValues)

                }
            }

            return cursor

        }

        return null
    }


    override fun insert(uri: Uri, contentValues: ContentValues?): Uri?
    {
        // not implemented
        return null
    }

    override fun delete(uri: Uri, s: String?, strings: Array<String>?): Int
    {
        // not implemented
        return 0
    }


    override fun update(uri: Uri, contentValues: ContentValues?, s: String?, strings: Array<String>?): Int
    {
        return 0
    }


    /**
     * Since this won't be used by external apps we don't need this
     */
    override
    fun getType(uri: Uri): String?
    {
        return null
    }

}
