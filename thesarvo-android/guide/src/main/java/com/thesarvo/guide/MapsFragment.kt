package com.thesarvo.guide

import android.Manifest
import android.os.Bundle
import android.util.Log
import android.view.InflateException
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import permissions.dispatcher.NeedsPermission
import permissions.dispatcher.RuntimePermissions
import java.util.*


@RuntimePermissions
class MapsFragment : androidx.fragment.app.Fragment()
{

    private var mMap: GoogleMap? = null // Might be null if Google Play services APK is not available.
    private var singleNodeData: String? = null
    private var viewId: String? = null

    override fun onCreate(savedInstanceState: Bundle?)
    {
        super.onCreate(savedInstanceState)

        //setContentView(R.layout.activity_maps);


        //getActionBar().setDisplayHomeAsUpEnabled(true);


        if (arguments!!.containsKey(GuideDetailFragment.SINGLE_NODE_DATA))
        {
            singleNodeData = arguments!!.getString(GuideDetailFragment.SINGLE_NODE_DATA)
        }
        if (arguments!!.containsKey(GuideDetailFragment.ARG_ITEM_ID))
        {
            viewId = arguments!!.getString(GuideDetailFragment.ARG_ITEM_ID)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View?
    {
        if (rootView != null)
        {
            val parent = rootView?.parent as? ViewGroup
            parent?.removeView(rootView)
        }
        try
        {
            rootView = inflater.inflate(R.layout.activity_maps, container, false)
        }
        catch (e: InflateException)
        {
            //Map is already created, do nothing
        }

        setUpMapIfNeeded()

        return rootView
    }

    override fun onDestroyView()
    {
        super.onDestroyView()
        if (mMap != null)
        {
            /*getFragmentManager().beginTransaction().remove(getFragmentManager().findFragmentById(R.id.map))
                    .commit();*/
            //rootView.setVisibility(View.GONE);
            mMap = null
        }
    }

    override fun onResume()
    {
        super.onResume()
        setUpMapIfNeeded()
    }

    /**
     * Sets up the map if it is possible to do so (i.e., the Google Play services APK is correctly
     * installed) and the map has not already been instantiated.. This will ensure that we only ever
     * call [.setUpMap] once when [.mMap] is not null.
     *
     *
     * If it isn't installed [SupportMapFragment] (and
     * [MapView][com.google.android.gms.maps.MapView]) will show a prompt for the user to
     * install/update the Google Play services APK on their device.
     *
     *
     * A user can return to this FragmentActivity after following the prompt and correctly
     * installing/updating/enabling the Google Play services. Since the FragmentActivity may not
     * have been completely destroyed during this process (it is likely that it would only be
     * stopped or paused), [.onCreate] may not be called again so we should call this
     * method in [.onResume] to guarantee that it will be called.
     */
    private fun setUpMapIfNeeded()
    {
        // Do a null check to confirm that we have not already instantiated the map.
        if (mMap == null)
        {
            // Try to obtain the map from the SupportMapFragment.

            val mapFragment = getChildFragmentManager().findFragmentById(R.id.map) as? SupportMapFragment

            if (mapFragment != null)
            {
                mapFragment.getMapAsync {

                    synchronized(this)
                    {
                        if (mMap == null)
                        {
                            mMap = it
                            setUpMap()
                        }
                    }
                }
                /* FIXME getMap doesnt work
                mMap = mapFragment.getMap();
                // Check if we were successful in obtaining the map.
                if (mMap != null)
                {
                    setUpMap();
                }
                */
            }
        }
    }

    @NeedsPermission(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)
    fun enableLocation()
    {
        val map = mMap ?: return

        try
        {
            map.isMyLocationEnabled = true
        }
        catch (ex: SecurityException)
        {
            Log.e("thesarvo", "Security Exception", ex)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // NOTE: delegate the permission handling to generated function
        onRequestPermissionsResult(requestCode, grantResults)
    }


    /**
     * This is where we can add markers or lines, add listeners or move the camera. In this case, we
     * just add a marker near Africa.
     *
     *
     * This should only be called once and when we are sure that [.mMap] is not null.
     */
    private fun setUpMap()
    {
        val map = mMap
        if (map == null)
            return

        val viewId = this.viewId

        enableLocationWithPermissionCheck()

        var gpsPoints = GuideApplication.get().indexManager.index?.gpsPoints
        if (gpsPoints != null )
        {

            if (viewId != null)
            {
                gpsPoints = ArrayList<GPSNode>(gpsPoints.filter { it.viewId == viewId })
            }

            val builder = LatLngBounds.Builder()
            val points = ArrayList<LatLng>()
            for (gpsNode in gpsPoints)
            {
                for (point in gpsNode.points)
                {
                    if (point.isValid)
                    {
                        val latlng = point.latLng
                        map.addMarker(MarkerOptions()
                                .position(latlng)
                                .title("" + point.description)
                                .snippet(point.latLng.toString()))

                        builder.include(latlng)
                        points.add(latlng)
                    }
                }

            }
            val bounds = builder.build()
            if (points.size > 1)
            {
                val padding = 4 // offset from edges of the map in pixels
                val cu = CameraUpdateFactory.newLatLngBounds(bounds, padding)
                map.moveCamera(cu)
            }
            else if (points.size == 1)
            {
                val cu = CameraUpdateFactory.newLatLngZoom(points[0], 12F)
                map.moveCamera(cu)
            }

        }
    }

    companion object
    {
        private var rootView: View? = null

    }


}
