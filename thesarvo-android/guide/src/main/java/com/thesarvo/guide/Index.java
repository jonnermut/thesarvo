package com.thesarvo.guide;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Created by jon on 5/9/17.
 */

public class Index implements Serializable
{
    private final static long serialVersionUID = 1;

    //public long assetLastMod;

    private Map<String, IndexEntry> indexEntries = new ConcurrentHashMap<String, IndexEntry>();



    public void index(IndexEntry entry)
    {

        if (entry.searchText == null)
        {
            String t = entry.text;
            if (t == null)
                t = entry.viewName;
            if (t != null)
                entry.searchText = t.toLowerCase().trim();
        }
        String key = entry.key;

        if (key != null)
        {


            synchronized (this)
            {
                indexEntries.put(key, entry);
            }
        }

    }

    public List<IndexEntry> search(String selection)
    {
        List<IndexEntry> ret = new ArrayList<>();

        if (selection == null || selection.length() < 2)
        {
            return ret;
        }

        synchronized (this)
        {
            for (Map.Entry<String, IndexEntry> entry: indexEntries.entrySet())
            {
                String key = entry.getKey();
                IndexEntry ie = entry.getValue();
                String searchText = ie.searchText;
                if (searchText != null && searchText.contains(selection))
                {
                    ret.add(entry.getValue());
                    if (ret.size() > 50)
                    {
                        return ret;
                    }
                }
            }
        }
        return ret;
    }
}
