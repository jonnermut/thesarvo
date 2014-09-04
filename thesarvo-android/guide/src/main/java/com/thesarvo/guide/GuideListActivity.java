package com.thesarvo.guide;

import android.content.Intent;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentTransaction;


/**
 * An activity representing a list of Guides. This activity
 * has different presentations for handset and tablet-size devices. On
 * handsets, the activity presents a list of items, which when touched,
 * lead to a {@link GuideDetailActivity} representing
 * item details. On tablets, the activity presents the list of items and
 * item details side-by-side using two vertical panes.
 * <p/>
 * The activity makes heavy use of fragments. The list of items is a
 * {@link GuideListFragment} and the item details
 * (if present) is a {@link GuideDetailFragment}.
 * <p/>
 * This activity also implements the required
 * {@link GuideListFragment.Callbacks} interface
 * to listen for item selections.
 */
public class GuideListActivity extends FragmentActivity
        implements GuideListFragment.Callbacks
{

    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    private boolean mTwoPane;

    private static GuideListActivity instance = null;

    public static GuideListActivity get()
    {
        return  instance;
    }


    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        if (instance ==  null)
            instance = this;

        ViewModel.get().getRootView();

        String id = getIntent().getStringExtra(GuideDetailFragment.ARG_ITEM_ID);


        setContentView(R.layout.activity_guide_list);

        if (findViewById(R.id.guide_detail_container) != null)
        {
            // The detail container view will be present only in the
            // large-screen layouts (res/values-large and
            // res/values-sw600dp). If this view is present, then the
            // activity should be in two-pane mode.
            mTwoPane = true;

            // In two-pane mode, list items should be given the
            // 'activated' state when touched.
            GuideListFragment fragment = (GuideListFragment) getSupportFragmentManager().findFragmentById(R.id.guide_list);
            fragment.setActivateOnItemClick(true);

            if (id != null)
            {
                fragment.setViewDef( ViewModel.get().getViews().get(id) );
            }
        }

        // TODO: If exposing deep links into your app, handle intents here.
    }

    /**
     * Callback method from {@link GuideListFragment.Callbacks}
     * indicating that the item with the given ID was selected.
     */
    @Override
    public void onItemSelected(String id)
    {
        if (id==null || id.length() == 0)
            return;

        if (id.startsWith("http") || id.startsWith("guide."))
        {
            showDetail(id, null, false);

        }
        else if(id.startsWith("Map"))
        {
            //start the map activity
            Intent intent = new Intent(this, MapsActivity.class);
            startActivity(intent);
        }
        else
        {
            if (mTwoPane)
            {
                // In two-pane mode, show the detail view in this activity by
                // adding or replacing the detail fragment using a
                // fragment transaction.
                Bundle arguments = new Bundle();
                arguments.putString(GuideDetailFragment.ARG_ITEM_ID, id);
                GuideListFragment fragment = new GuideListFragment();
                fragment.setArguments(arguments);
                int guide_list_id = R.id.guide_list;

                addFragment(guide_list_id, fragment, true);


            }
            else
            {
                // FIXME - args not getting through!
                Intent listIntent = new Intent(this, GuideListActivity.class);
                listIntent.putExtra(GuideDetailFragment.ARG_ITEM_ID, id);
                startActivity(listIntent);
            }
        }


    }

    public void showDetail(String id, String singleNodeData, boolean history)
    {
        if (mTwoPane)
        {
            // In two-pane mode, show the detail view in this activity by
            // adding or replacing the detail fragment using a
            // fragment transaction.
            Bundle arguments = new Bundle();
            arguments.putString(GuideDetailFragment.ARG_ITEM_ID, id);

            if (singleNodeData != null)
                arguments.putString(GuideDetailFragment.SINGLE_NODE_DATA, singleNodeData);

            GuideDetailFragment fragment = new GuideDetailFragment();
            fragment.setArguments(arguments);


            addFragment(R.id.guide_detail_container, fragment, history);
        }
        else
        {
            // In single-pane mode, simply start the detail activity
            // for the selected item ID.
            Intent detailIntent = new Intent(this, GuideDetailActivity.class);
            detailIntent.putExtra(GuideDetailFragment.ARG_ITEM_ID, id);
            startActivity(detailIntent);
        }
    }

    public void addFragment(int fragmentId, android.support.v4.app.Fragment newFragment, boolean history)
    {
        // Add the fragment to the activity, pushing this transaction
        // on to the back stack.
        FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
        //getFragmentManager().beginTransaction();
        ft.replace(fragmentId, newFragment);
        ft.setTransition(FragmentTransaction.TRANSIT_FRAGMENT_FADE);

        if (history)
            ft.addToBackStack(null);
        ft.commit();
    }




}
