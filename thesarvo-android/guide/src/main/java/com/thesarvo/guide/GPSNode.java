package com.thesarvo.guide;

import java.util.List;

/**
 * Created by Karl on 4/09/2014.
 */
public class GPSNode
{
    String id;
    List<Point> points;


    public GPSNode(String id, List<Point> point)
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
