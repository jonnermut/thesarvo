package com.thesarvo.guide;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.support.v4.app.ListFragment;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ListView;


/**
 * A list fragment representing a list of Guides. This fragment
 * also supports tablet devices by allowing list items to be given an
 * 'activated' state upon selection. This helps indicate which item is
 * currently being viewed in a {@link GuideDetailFragment}.
 * <p/>
 * Activities containing this fragment MUST implement the {@link Callbacks}
 * interface.
 */
public class GuideListFragment extends ListFragment
{

    private boolean activateOnItemClickLater;

    public ViewModel.ViewDef getViewDef()
    {
        if (viewDef == null)
            viewDef = ViewModel.get().getRootView();

        return viewDef;
    }

    public void setViewDef(ViewModel.ViewDef vd)
    {
        viewDef = vd;
    }


    ViewModel.ViewDef viewDef;

    /**
     * The serialization (saved instance state) Bundle key representing the
     * activated item position. Only used on tablets.
     */
    private static final String STATE_ACTIVATED_POSITION = "activated_position";

    /**
     * The fragment's current callback object, which is notified of list item
     * clicks.
     */
    private Callbacks mCallbacks = sDummyCallbacks;

    /**
     * The current activated item position. Only used on tablets.
     */
    private int mActivatedPosition = ListView.INVALID_POSITION;

    /**
     * A callback interface that all activities containing this fragment must
     * implement. This mechanism allows activities to be notified of item
     * selections.
     */
    public interface Callbacks
    {
        /**
         * Callback for when an item has been selected.
         */
        public void onItemSelected(String id);
    }

    /**
     * A dummy implementation of the {@link Callbacks} interface that does
     * nothing. Used only when this fragment is not attached to an activity.
     */
    private static Callbacks sDummyCallbacks = new Callbacks()
    {
        @Override
        public void onItemSelected(String id)
        {
        }
    };

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public GuideListFragment()
    {
    }

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        if (getArguments()!=null && getArguments().containsKey(GuideDetailFragment.ARG_ITEM_ID))
        {
            // Load the dummy content specified by the fragment
            // arguments. In a real-world scenario, use a Loader
            // to load content from a content provider.
            String itemId = getArguments().getString(GuideDetailFragment.ARG_ITEM_ID);

            if (itemId != null)
                viewDef = ViewModel.get().getViews().get(itemId);
        }


        // TODO: replace with a real list adapter.
        ArrayAdapter<ViewModel.ListItem> adapter = new ArrayAdapter<>(
                getActivity(),
                android.R.layout.simple_list_item_activated_1,
                android.R.id.text1,
                getViewDef().getListItems());


        setListAdapter(adapter);
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState)
    {
        super.onViewCreated(view, savedInstanceState);

        // Restore the previously serialized activated item position.
        if (savedInstanceState != null
                && savedInstanceState.containsKey(STATE_ACTIVATED_POSITION))
        {
            setActivatedPosition(savedInstanceState.getInt(STATE_ACTIVATED_POSITION));
        }

        getListView().setBackgroundColor(Color.WHITE);

        if(activateOnItemClickLater)
            setActivateOnItemClick(true);
    }

    @Override
    public void onAttach(Activity activity)
    {
        super.onAttach(activity);

        // Activities containing this fragment must implement its callbacks.
        if (!(activity instanceof Callbacks))
        {
            throw new IllegalStateException("Activity must implement fragment's callbacks.");
        }

        mCallbacks = (Callbacks) activity;
    }

    @Override
    public void onDetach()
    {
        super.onDetach();

        // Reset the active callbacks interface to the dummy implementation.
        mCallbacks = sDummyCallbacks;
    }

    @Override
    public void onListItemClick(ListView listView, View view, int position, long id)
    {
        super.onListItemClick(listView, view, position, id);

        // Notify the active callbacks interface (the activity, if the
        // fragment is attached to one) that an item has been selected.
        mCallbacks.onItemSelected( this.viewDef.getListItems().get(position).getViewId());
    }

    @Override
    public void onSaveInstanceState(Bundle outState)
    {
        super.onSaveInstanceState(outState);
        if (mActivatedPosition != ListView.INVALID_POSITION)
        {
            // Serialize and persist the activated item position.
            outState.putInt(STATE_ACTIVATED_POSITION, mActivatedPosition);
        }
    }

    /**
     * Turns on activate-on-click mode. When this mode is on, list items will be
     * given the 'activated' state when touched.
     */
    public void setActivateOnItemClick(boolean activateOnItemClick)
    {
        // When setting CHOICE_MODE_SINGLE, ListView will automatically
        // give items the 'activated' state when touched.
        if(!isVisible())    //wait till it's visible is it's not to avoid illegal state exception
        {
            activateOnItemClickLater = true;
        }
        else
        {
            getListView().setChoiceMode(activateOnItemClick
                    ? ListView.CHOICE_MODE_SINGLE
                    : ListView.CHOICE_MODE_NONE);
        }
    }

    private void setActivatedPosition(int position)
    {
        if (position == ListView.INVALID_POSITION)
        {
            getListView().setItemChecked(mActivatedPosition, false);
        }
        else
        {
            getListView().setItemChecked(position, true);
        }

        mActivatedPosition = position;
    }
}
