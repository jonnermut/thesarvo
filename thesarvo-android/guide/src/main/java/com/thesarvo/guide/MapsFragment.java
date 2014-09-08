package com.thesarvo.guide;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.MarkerOptions;

import java.util.ArrayList;
import java.util.List;

public class MapsFragment extends Fragment
{

    private GoogleMap mMap; // Might be null if Google Play services APK is not available.
    private View rootView;
    private String singleNodeData;


    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        //setContentView(R.layout.activity_maps);


        //getActionBar().setDisplayHomeAsUpEnabled(true);


        if (getArguments().containsKey(GuideDetailFragment.SINGLE_NODE_DATA))
        {
            singleNodeData = getArguments().getString(GuideDetailFragment.SINGLE_NODE_DATA);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState)
    {

        //FIXME, if the maps button is pressed twice app crashes here
        if (rootView == null)
            rootView = inflater.inflate(R.layout.activity_maps, container, false);

        setUpMapIfNeeded();

        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();
        setUpMapIfNeeded();
    }

    /**
     * Sets up the map if it is possible to do so (i.e., the Google Play services APK is correctly
     * installed) and the map has not already been instantiated.. This will ensure that we only ever
     * call {@link #setUpMap()} once when {@link #mMap} is not null.
     * <p>
     * If it isn't installed {@link SupportMapFragment} (and
     * {@link com.google.android.gms.maps.MapView MapView}) will show a prompt for the user to
     * install/update the Google Play services APK on their device.
     * <p>
     * A user can return to this FragmentActivity after following the prompt and correctly
     * installing/updating/enabling the Google Play services. Since the FragmentActivity may not
     * have been completely destroyed during this process (it is likely that it would only be
     * stopped or paused), {@link #onCreate(Bundle)} may not be called again so we should call this
     * method in {@link #onResume()} to guarantee that it will be called.
     */
    private void setUpMapIfNeeded()
    {
        // Do a null check to confirm that we have not already instantiated the map.
        if (mMap == null)
        {
            // Try to obtain the map from the SupportMapFragment.

            SupportMapFragment mapFragment = (SupportMapFragment) getFragmentManager().findFragmentById(R.id.map);

            if (mapFragment != null)
            {
                mMap = mapFragment.getMap();
                // Check if we were successful in obtaining the map.
                if (mMap != null)
                {
                    setUpMap();
                }
            }
        }
    }

    /**
     * This is where we can add markers or lines, add listeners or move the camera. In this case, we
     * just add a marker near Africa.
     * <p>
     * This should only be called once and when we are sure that {@link #mMap} is not null.
     */
    private void setUpMap()
    {

        if (mMap == null)
            return;

        List<GPSNode> gpsPoints = getGPSPoints();

        if (singleNodeData != null)
        {

        }

        for(GPSNode gpsNode : gpsPoints)
        {
            for(Point point : gpsNode.getPoints())
            {
                if (point!=null
                        && point.isValid()
                        && point.getLatLng() != null)
                {
                    mMap.addMarker(new MarkerOptions()
                            .position(point.getLatLng())
                            .title("" + point.getDescription())
                            .snippet(point.getLatLng().toString()));
                }
            }

        }
    }

    private static List<GPSNode> GPSPoints = new ArrayList<>();

    public static List<GPSNode> getGPSPoints()
    {
        return GPSPoints;
    }




}
