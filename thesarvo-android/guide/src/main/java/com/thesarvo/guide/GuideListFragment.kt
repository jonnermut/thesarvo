//package com.thesarvo.guide
//
//import android.app.Activity
//import android.graphics.Color
//import android.os.Bundle
//import android.support.v4.app.ListFragment
//import android.view.View
//import android.widget.ArrayAdapter
//import android.widget.ListView
//
//
///**
// * A list fragment representing a list of Guides. This fragment
// * also supports tablet devices by allowing list items to be given an
// * 'activated' state upon selection. This helps indicate which item is
// * currently being viewed in a [GuideDetailFragment].
// *
// *
// * Activities containing this fragment MUST implement the [Callbacks]
// * interface.
// */
///**
// * Mandatory empty constructor for the fragment manager to instantiate the
// * fragment (e.g. upon screen orientation changes).
// */
//class GuideListFragment : ListFragment()
//{
//
//    private var activateOnItemClickLater: Boolean = false
//
//
//    internal var viewDef: Model.ViewDef? = null
//
//    /**
//     * The fragment's current callback object, which is notified of list item
//     * clicks.
//     */
//    private var mCallbacks = sDummyCallbacks
//
//    /**
//     * The current activated item position. Only used on tablets.
//     */
//    private var mActivatedPosition = ListView.INVALID_POSITION
//
//    fun getViewDef(): Model.ViewDef
//    {
//        if (viewDef == null)
//        {
//            viewDef = Model.get().rootView
//        }
//
//        return viewDef!!
//    }
//
//    fun setViewDef(vd: Model.ViewDef)
//    {
//        viewDef = vd
//    }
//
//    /**
//     * A callback interface that all activities containing this fragment must
//     * implement. This mechanism allows activities to be notified of item
//     * selections.
//     */
//    interface Callbacks
//    {
//        /**
//         * Callback for when an item has been selected.
//         */
//        fun onItemSelected(id: String)
//    }
//
//    override fun onCreate(savedInstanceState: Bundle?)
//    {
//        super.onCreate(savedInstanceState)
//
//        if (arguments != null && arguments!!.containsKey(GuideDetailFragment.ARG_ITEM_ID))
//        {
//            // Load the dummy content specified by the fragment
//            // arguments. In a real-world scenario, use a Loader
//            // to load content from a content provider.
//            val itemId = arguments!!.getString(GuideDetailFragment.ARG_ITEM_ID)
//
//            if (itemId != null)
//                viewDef = Model.get().getViews()[itemId]
//        }
//
//
//        // TODO: replace with a real list adapter.
//        val adapter = ArrayAdapter<Model.ListItem>(
//                activity!!,
//                android.R.layout.simple_list_item_activated_1,
//                android.R.id.text1,
//                getViewDef().getListItems())
//
//
//        listAdapter = adapter
//
//        //may as well set this to true, it will disappear on phones anyway
//        //TODO test this actually dosen't have negitive effects on phones
//        setActivateOnItemClick(true)
//    }
//
//    override fun onViewCreated(view: View, savedInstanceState: Bundle?)
//    {
//        super.onViewCreated(view, savedInstanceState)
//
//        // Restore the previously serialized activated item position.
//        if (savedInstanceState != null && savedInstanceState.containsKey(STATE_ACTIVATED_POSITION))
//        {
//            setActivatedPosition(savedInstanceState.getInt(STATE_ACTIVATED_POSITION))
//        }
//
//        listView.setBackgroundColor(Color.WHITE)
//
//        if (activateOnItemClickLater)
//            setActivateOnItemClick(true)
//    }
//
//    override fun onAttach(activity: Activity?)
//    {
//        super.onAttach(activity)
//
//        // Activities containing this fragment must implement its callbacks.
//        if (activity !is Callbacks)
//        {
//            throw IllegalStateException("Activity must implement fragment's callbacks.")
//        }
//
//        mCallbacks = activity
//    }
//
//    override fun onDetach()
//    {
//        super.onDetach()
//
//        // Reset the active callbacks interface to the dummy implementation.
//        mCallbacks = sDummyCallbacks
//    }
//
//    override fun onListItemClick(listView: ListView?, view: View?, position: Int, id: Long)
//    {
//        super.onListItemClick(listView, view, position, id)
//
//        // Notify the active callbacks interface (the activity, if the
//        // fragment is attached to one) that an item has been selected.
//        mCallbacks.onItemSelected(this.viewDef!!.getListItems()[position].viewId)
//    }
//
//    override fun onSaveInstanceState(outState: Bundle)
//    {
//        super.onSaveInstanceState(outState)
//        if (mActivatedPosition != ListView.INVALID_POSITION)
//        {
//            // Serialize and persist the activated item position.
//            outState.putInt(STATE_ACTIVATED_POSITION, mActivatedPosition)
//        }
//    }
//
//    /**
//     * Turns on activate-on-click mode. When this mode is on, list items will be
//     * given the 'activated' state when touched.
//     */
//    fun setActivateOnItemClick(activateOnItemClick: Boolean)
//    {
//        // When setting CHOICE_MODE_SINGLE, ListView will automatically
//        // give items the 'activated' state when touched.
//        if (!isVisible)
//        //wait till it's visible is it's not to avoid illegal state exception
//        {
//            activateOnItemClickLater = true
//        }
//        else
//        {
//            listView.choiceMode = if (activateOnItemClick)
//                ListView.CHOICE_MODE_SINGLE
//            else
//                ListView.CHOICE_MODE_NONE
//        }
//    }
//
//    private fun setActivatedPosition(position: Int)
//    {
//        if (position == ListView.INVALID_POSITION)
//        {
//            listView.setItemChecked(mActivatedPosition, false)
//        }
//        else
//        {
//            listView.setItemChecked(position, true)
//        }
//
//        mActivatedPosition = position
//    }
//
//    companion object
//    {
//
//        /**
//         * The serialization (saved instance state) Bundle key representing the
//         * activated item position. Only used on tablets.
//         */
//        private val STATE_ACTIVATED_POSITION = "activated_position"
//
//        /**
//         * A dummy implementation of the [Callbacks] interface that does
//         * nothing. Used only when this fragment is not attached to an activity.
//         */
//        private val sDummyCallbacks: Callbacks = object : Callbacks
//        {
//            override fun onItemSelected(id: String)
//            {
//            }
//        }
//    }
//}
