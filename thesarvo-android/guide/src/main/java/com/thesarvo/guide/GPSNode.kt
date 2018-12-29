package com.thesarvo.guide

/**
 * Created by Karl on 4/09/2014.
 */
class GPSNode(id: String, point: List<Point>)
{
    var id: String
        internal set
    var points: List<Point>
        internal set


    init
    {
        this.id = id
        this.points = point
    }
}
