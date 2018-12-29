package com.thesarvo.guide

import com.google.android.gms.maps.model.LatLng

import org.w3c.dom.Element

/**
 * Created by Karl on 4/09/2014.
 */
class Point {
    var isValid: Boolean = false
        private set
    var latLng: LatLng
        internal set
    var description: String
        internal set
    var code: String
        internal set

    constructor(latLng: LatLng, description: String, code: String) {
        this.latLng = latLng
        this.description = description
        this.code = code

        //if latLng is 0.0 0.0 we can assume it's not valid, none of the points are in africa
        //saves having to save this data in the table
        if (!(latLng.latitude == 0.0 && latLng.longitude == 0.0)) {
            isValid = true
        }
    }

    constructor() {
        description = ""
        code = ""
        latLng = LatLng(0.0, 0.0)
    }

    constructor(ePoint: Element) {
        val longitude = ePoint.getAttribute("longitude")
        val latitude = ePoint.getAttribute("latitude")
        description = ePoint.getAttribute("description")
        code = ePoint.getAttribute("code")

        var lon = 0.0
        var lat = 0.0

        try {
            lon = java.lang.Double.valueOf(longitude)!!
            lat = java.lang.Double.valueOf(latitude)!!
            isValid = true
        } catch (ex: NumberFormatException) {
            ex.printStackTrace()

        }

        latLng = LatLng(lat, lon)
    }


}