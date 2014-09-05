package com.thesarvo.guide;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by Karl on 4/09/2014.
 */
public class IndexEntry
{
    public String viewId;
    public String viewName;
    public String elementID;
    public String text;

    private static Map<String, IndexEntry> index = new HashMap<>();

    public static Map<String, IndexEntry> getIndex()
    {
        return index;
    }

    public IndexEntry()
    {
        viewId = "";
        viewName = "";
        elementID = "";
        text = "";
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
}
