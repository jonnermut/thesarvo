package com.thesarvo.guide;

import android.app.ListActivity;
import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ListAdapter;
import android.widget.ListView;
import android.widget.SimpleCursorAdapter;


public class SearchableActivity extends ListActivity
{

    public static final String SEARCH_ITEM_SELECTED = "com.thesarvo.guide.SEARCH_SELECT";
    public static final String SEARCH_ITEM_QUICK_SELECT = "com.thesarvo.guide.SEARCH_QUICK";
    public static final String SEARCH_ITEM_QUERY = "com.thesarvo.guide.SEARCH_QUERY";
    public static final String SEARCH_QUICK_QUERY = "com.thesarvo.guide.QUICK_QUERY";
    public static final String SEARCH_QUICK_CHOICE = "com.thesarvo.guide.QUICK_ITEM";

    private static final String[] COLS = {IndexContentProvider.COL_TEXT, IndexContentProvider.COL_VIEW_ID};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_searchable);

        getActionBar().setDisplayHomeAsUpEnabled(true);

        // Get the intent, verify the action and get the query
        Intent intent = getIntent();
        if (Intent.ACTION_SEARCH.equals(intent.getAction())) {
            String query = intent.getStringExtra(SearchManager.QUERY);
            //ListAdapter results = doMySearch(query);
            //setListAdapter(results);

            //pass the query as an intent back to main activity
            Intent newIntent = new Intent(this, GuideListActivity.class);
            newIntent.putExtra(SEARCH_ITEM_QUERY, query);
            newIntent.setAction(SEARCH_ITEM_SELECTED);  //not really what's happening anymore but lets use it
            newIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

            startActivity(newIntent);

        }
        else if (intent.ACTION_VIEW.equals(intent.getAction()))
        {
            //TODO, if a quick search is selected we don't get the query, this means we want to nagigate to the appropriate menu in the side
            Uri data = intent.getData();
            String query = intent.getStringExtra(SearchManager.QUERY);
            Log.d("Selected suggestion", data.toString() + " " + query);

            Intent newIntent = new Intent(this, GuideListActivity.class);
            newIntent.setAction(SEARCH_ITEM_QUICK_SELECT);

            //TODO pass the intent back, better if we can just make the list view searchable and handel it there
            //WHAT I WAS DOING: trying to make it so it passed the intent back strait away
            //but instead I'll try to do away with this activity alltogether

            //pass the uri back
            newIntent.setData(data);
            //TODO this is good on a table, but on phone it means it exits when you try to go back...
            //might be able to manipulate the back stack somehow
            newIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);


            startActivity(newIntent);
            finish();
        }
    }

    private static final String[] SEARCH_PROJECTION = {IndexContentProvider.COL_TEXT,
    IndexContentProvider.COL_VIEW_NAME, IndexContentProvider.COL_VIEW_ID,
    IndexContentProvider.COL_ID/*, IndexContentProvider.COL_ELEMENT_ID*/};

    private static final int[] TO_COLS = {R.id.textViewItem, R.id.placeSubtitle};

    private ListAdapter doMySearch(String query)
    {
        Log.d("Search", "Searching");

        Uri.Builder builder = new Uri.Builder();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.MAIN_TABLE);

        Cursor cursor = getContentResolver().query(builder.build(),
                SEARCH_PROJECTION, query, null, null);

        SimpleCursorAdapter adapter = new SimpleCursorAdapter(this,
                R.layout.search_item,
                cursor,
                SEARCH_PROJECTION,
                TO_COLS,
                0);

        adapter.setStringConversionColumn(3);   //sets the conversion column to the id column

        return adapter;
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
        //send an intent back to GuideListActivity to open this page.
        Intent intent = new Intent(this, GuideListActivity.class);
        intent.setAction(SEARCH_ITEM_SELECTED);

        //instead pass data as a URI
        Uri.Builder builder = new Uri.Builder();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);

        builder.path(IndexContentProvider.MAIN_TABLE + "/" + id);

        intent.setData(builder.build());

        startActivity(intent);
    }
}
