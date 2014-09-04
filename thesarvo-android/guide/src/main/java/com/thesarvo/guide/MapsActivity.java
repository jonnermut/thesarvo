package com.thesarvo.guide;

import android.content.res.AssetManager;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.util.Log;

import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.util.ArrayList;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

public class MapsActivity extends FragmentActivity {

    private GoogleMap mMap; // Might be null if Google Play services APK is not available.



    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_maps);
        setUpMapIfNeeded();

    }

    @Override
    protected void onResume() {
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
    private void setUpMapIfNeeded() {
        // Do a null check to confirm that we have not already instantiated the map.
        if (mMap == null) {
            // Try to obtain the map from the SupportMapFragment.
            mMap = ((SupportMapFragment) getSupportFragmentManager().findFragmentById(R.id.map))
                    .getMap();
            // Check if we were successful in obtaining the map.
            if (mMap != null) {
                setUpMap();
            }
        }
    }

    /**
     * This is where we can add markers or lines, add listeners or move the camera. In this case, we
     * just add a marker near Africa.
     * <p>
     * This should only be called once and when we are sure that {@link #mMap} is not null.
     */
    private void setUpMap() {

        for(GPSnode gpsNode : getGPSPoints())
        {
            for(Point point : gpsNode.getPoints())
            {
                mMap.addMarker( new MarkerOptions()
                        .position(point.getLatLng())
                        .title(point.getDescription())
                        .snippet(point.getLatLng().toString()));
            }

        }
    }

    List<GPSnode> GPSPoints = new ArrayList<>();

    public List<GPSnode> getGPSPoints()
    {
        if(GPSPoints.size() == 0)
        {
            try
            {
                Log.d("GPS List Builder", "Building");
                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

                DocumentBuilder builder = factory.newDocumentBuilder();
                AssetManager manager = getAssets();

                //load up all "ListItems"
                for(ViewModel.ListItem listItem : ViewModel.get().getGuideListItems().values())
                {
                    //TODO make this better...
                    String fileName = listItem.getViewId().substring(6) +  ".xml";
                    //Log.d("GPS List Builder", "Looking at " + "www/data/" + fileName);

                    Document dom = builder.parse(manager.open("www/data/"+fileName));

                    //create the GPS nodes, should only be one but just in case...
                    for(Element gps : Xml.getElements(dom.getElementsByTagName("gps")))
                    {
                        String id = gps.getAttribute("id");
                        List<Point> points = new ArrayList<>();

                        //Log.d("GPS List Builder", "Building at " + id);

                        for(Element elPoint : Xml.getElements(gps.getElementsByTagName("point")))
                        {
                            try
                            {
                                Point point = new Point(new LatLng(Double.valueOf(elPoint.getAttribute("latitude")),
                                        Double.valueOf(elPoint.getAttribute("longitude"))),
                                        elPoint.getAttribute("description"),
                                        elPoint.getAttribute("code"));

                                //Log.d("GPS List Builder", "adding " + point.getDescription());

                                points.add(point);
                            }
                            catch(NumberFormatException e)
                            {
                                e.printStackTrace();
                                continue;
                            }
                        }

                        GPSnode gpsNode = new GPSnode(id, points);

                        GPSPoints.add(gpsNode);
                    }
                }


            }
            catch (Throwable t)
            {
                t.printStackTrace();
            }

        }

        return GPSPoints;
    }

    public class Point
    {
        LatLng latLng;
        String description;
        String code;

        public Point(LatLng latLng, String description, String code)
        {
            this.latLng = latLng;
            this.description = description;
            this.code = code;
        }

        public LatLng getLatLng()
        {
            return latLng;
        }

        public String getDescription()
        {
            return description;
        }

        public String getCode()
        {
            return code;
        }
    }

    public class GPSnode
    {
        String id;
        List<Point> points;


        public GPSnode(String id, List<Point> point)
        {
            this.id = id;
            this.points = point;
        }

        public String getId()
        {
            return id;
        }


        public List<Point> getPoints()
        {
            return points;
        }
    }
}
