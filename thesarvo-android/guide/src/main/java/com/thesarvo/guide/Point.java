package com.thesarvo.guide;

import com.google.android.gms.maps.model.LatLng;

/**
 * Created by Karl on 4/09/2014.
 */
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

    public Point()
    {
        description = "";
        code = "";
        latLng = new LatLng(0.0, 0.0);
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