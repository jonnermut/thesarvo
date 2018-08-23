package com.thesarvo.guide;

import android.database.MatrixCursor;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by Karl on 4/09/2014.
 */
public class IndexEntry implements Serializable
{
    private final static long serialVersionUID = 1;

    enum IndexType implements Serializable
    {
        CLIMB,
        PROBLEM,
        HEADING,
        MENU_ITEM,
        VIEW,
        NUM_INDEX_TYPE,
        INDEX_TYPE_INVALID


    }

    public String key;
    public String viewId;
    public String viewName;
    public String elementID;
    public String text;
    public String subtext="";
    public String searchText = null;

    public IndexType type;


    public IndexEntry()
    {
        viewId = "";
        viewName = "";
        elementID = "";
        text = "";
        type = IndexType.INDEX_TYPE_INVALID;
    }

    @Override
    public String toString()
    {
        return "IndexEntry{" +
                "viewId='" + viewId + '\'' +
                ", viewName='" + viewName + '\'' +
                ", elementID='" + elementID + '\'' +
                ", text='" + text + '\'' +
                '}';
    }

    public static final String[] INDEX_ENTRY_COLUMNS = {"_ID", "viewId", "viewName", "elementID", "text", "type"};

    public MatrixCursor toMatrixCursor()
    {
        MatrixCursor cursor = new MatrixCursor(INDEX_ENTRY_COLUMNS);

        Object[] columnValues = {Integer.valueOf(key), viewId, viewName, elementID, text, type};
        cursor.addRow(columnValues);

        return cursor;
    }
}
