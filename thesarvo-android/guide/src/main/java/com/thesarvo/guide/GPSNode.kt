package com.thesarvo.guide

import java.io.Serializable

/**
 * Created by Karl on 4/09/2014.
 */
class GPSNode(id: String, point: List<Point>): Serializable
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

    companion object
    {
        private const val serialVersionUID: Long = 1
    }
}
