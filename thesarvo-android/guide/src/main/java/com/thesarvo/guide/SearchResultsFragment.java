package com.thesarvo.guide;

import android.app.Activity;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.ListFragment;
import android.util.Log;
import android.view.View;
import android.widget.ListAdapter;
import android.widget.ListView;
import android.widget.SimpleCursorAdapter;

/**
 * A fragment representing a list of Items.
 * <p />
 * <p />
 * Activities containing this fragment MUST implement the {@link Callbacks}
 * interface.
 */
public class SearchResultsFragment extends ListFragment {


    OnFragmentInteractionListener mListener;


    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public SearchResultsFragment() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);


        String query = "NOTHING AT ALL";
        if(getArguments() != null && getArguments().containsKey(SearchableActivity.SEARCH_ITEM_QUERY))
        {
            query = getArguments().getString(SearchableActivity.SEARCH_ITEM_QUERY);
        }

        ListAdapter results = doMySearch(query);
        setListAdapter(results);


    }
    private static final String[] SEARCH_PROJECTION = {IndexContentProvider.COL_TEXT,
            IndexContentProvider.COL_VIEW_NAME, IndexContentProvider.COL_VIEW_ID,
            IndexContentProvider.COL_ID/*, IndexContentProvider.COL_ELEMENT_ID*/};

    private static final int[] TO_COLS = {R.id.textViewItem, R.id.placeSubtitle};

    private ListAdapter doMySearch(String query)
    {
        Log.d("Search Fragment", "Searching");

        Uri.Builder builder = new Uri.Builder();
        builder.scheme(ContentResolver.SCHEME_CONTENT);
        builder.authority(IndexContentProvider.AUTHORITY);
        builder.path(IndexContentProvider.MAIN_TABLE);

        Cursor cursor = getActivity().getContentResolver().query(builder.build(),
                SEARCH_PROJECTION, query, null, null);

        SimpleCursorAdapter adapter = new SimpleCursorAdapter(getActivity(),
                R.layout.search_item,
                cursor,
                SEARCH_PROJECTION,
                TO_COLS,
                0);

        adapter.setStringConversionColumn(3);   //sets the conversion column to the id column

        return adapter;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState)
    {
        super.onViewCreated(view, savedInstanceState);
    }

    @Override
    public void onAttach(Activity activity)
    {
        super.onAttach(activity);

        if(!(activity instanceof OnFragmentInteractionListener))
            throw new IllegalStateException("Activity must implement fragment callbacks");

        mListener = (OnFragmentInteractionListener) activity;
    }

    @Override
    public void onListItemClick(ListView l, View v, int position, long id) {
        super.onListItemClick(l, v, position, id);

        if (null != mListener) {
            // Notify the active callbacks interface (the activity, if the
            // fragment is attached to one) that an item has been selected.
            mListener.onSearchFragmentInteraction("" + id);
        }
    }

    /**
    * This interface must be implemented by activities that contain this
    * fragment to allow an interaction in this fragment to be communicated
    * to the activity and potentially other fragments contained in that
    * activity.
    * <p>
    * See the Android Training lesson <a href=
    * "http://developer.android.com/training/basics/fragments/communicating.html"
    * >Communicating with Other Fragments</a> for more information.
    */
    public interface OnFragmentInteractionListener {
        public void onSearchFragmentInteraction(String id);
    }

}
