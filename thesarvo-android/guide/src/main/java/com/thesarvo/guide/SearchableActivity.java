package com.thesarvo.guide;

import android.app.ListActivity;
import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ListAdapter;
import android.widget.ListView;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;


public class SearchableActivity extends ListActivity
{

    public static final String SEARCH_ITEM_SELECTED = "com.thesarvo.guide.SEARCH_SELECT";

    private static IndexEntry lastResult = null;
    private static final String[] COLS = {IndexContentProvider.COL_TEXT, IndexContentProvider.COL_VIEW_ID};

    public static IndexEntry getLastResult()
    {
        return lastResult;
    }

    private Uri searchUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_searchable);

        getActionBar().setDisplayHomeAsUpEnabled(true);

        // Get the intent, verify the action and get the query
        Intent intent = getIntent();
        if (Intent.ACTION_SEARCH.equals(intent.getAction())) {
            String query = intent.getStringExtra(SearchManager.QUERY);
            ListAdapter results = doMySearch(query);
            setListAdapter(results);
        }
        else if (intent.ACTION_VIEW.equals(intent.getAction()))
        {
            Uri data = intent.getData();
            Log.d("Selected suggestion", data.toString());
        }

        Uri.Builder builder = new Uri.Builder();
        builder.authority(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.MAIN_TABLE);
        searchUri = builder.build();
    }

    private ListAdapter doMySearch(String query)
    {
        Log.d("Search", "Searching");

        Map<String, IndexEntry> index = IndexEntry.getIndex();
        Set<String> keys = index.keySet();
        List<IndexEntry> results = new ArrayList<>();

        for(String s : keys)
        {
            if(s.toLowerCase().contains(query.toLowerCase()))
            {
                results.add(index.get(s));
            }
        }

        IndexEntry[] entries = new IndexEntry[results.size()];



        return new SearchResultsAdapter(this, R.layout.search_item,  results.toArray(entries));
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.searchable, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onListItemClick(ListView l, View v, int position, long id)
    {
        IndexEntry entry = (IndexEntry) getListAdapter().getItem(position);

        //send an intent back to GuideListActivity to open this page.
        Intent intent = new Intent(this, GuideListActivity.class);
        intent.setAction(SEARCH_ITEM_SELECTED);
        lastResult = entry;

        //put the key in a bundle, dosen't work for 4.0....
        Bundle options = new Bundle();
        options.putString("result", entry.text);

        startActivity(intent);
    }
}
