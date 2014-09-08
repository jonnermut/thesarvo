package com.thesarvo.guide;

import com.google.android.gms.maps.model.LatLng;

import org.w3c.dom.Element;

/**
 * Created by Karl on 4/09/2014.
 */
public class Point
{
    private boolean valid;
    LatLng latLng;
    String description;
    String code;

    public Point(LatLng latLng, String description, String code)
    {
        this.latLng = latLng;
        this.description = description;
        this.code = code;

        //if latLng is 0.0 0.0 we can assume it's not valid, none of the points are in africa
        //saves having to save this data in the table
        if(!(latLng.latitude == 0.0 && latLng.longitude == 0.0))
        {
            valid = true;
        }
    }

    public Point()
    {
        description = "";
        code = "";
        latLng = new LatLng(0.0, 0.0);
    }

    public Point(Element ePoint)
    {
        String longitude = ePoint.getAttribute("longitude");
        String latitude = ePoint.getAttribute("latitude");
        description = ePoint.getAttribute("description");
        code = ePoint.getAttribute("code");

        double lon=0, lat=0;

        try
        {
            lon = Double.valueOf(longitude);
            lat = Double.valueOf(latitude);
            valid = true;
        }
        catch (NumberFormatException ex)
        {
            ex.printStackTrace();

        }

        latLng = new LatLng(lat, lon);
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

    public boolean isValid()
    {
        return valid;
    }


}