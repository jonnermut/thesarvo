package com.thesarvo.guide

import java.io.Serializable

/**
 * Created by Karl on 4/09/2014.
 */
class GPSNode(viewId: String, id: String, point: List<Point>): Serializable
{
    var viewId: String

    var id: String
        internal set

    var points: List<Point>
        internal set


    init
    {
        this.id = id
        this.points = point
        this.viewId = viewId
    }

    companion object
    {
        private const val serialVersionUID: Long = 2
    }
}
