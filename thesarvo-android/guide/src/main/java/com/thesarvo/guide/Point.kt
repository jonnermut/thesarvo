package com.thesarvo.guide

import com.google.android.gms.maps.model.LatLng

import org.w3c.dom.Element
import java.io.Serializable

/**
 * Created by Karl on 4/09/2014.
 */
class Point : Serializable
{
    var isValid: Boolean = false
        private set
    val latLng: LatLng
        get() = LatLng(latitude, longitude)
    var description: String
        internal set
    var code: String
        internal set

    var longitude = 0.0
        private set
    var latitude = 0.0
        private set

    constructor(latLng: LatLng, description: String, code: String)
    {
        this.latitude = latLng.latitude
        this.longitude = latLng.longitude

        this.description = description
        this.code = code

        //if latLng is 0.0 0.0 we can assume it's not valid, none of the points are in africa
        //saves having to save this data in the table
        if (!(latLng.latitude == 0.0 && latLng.longitude == 0.0))
        {
            isValid = true
        }
    }

    constructor()
    {
        description = ""
        code = ""
    }

    constructor(ePoint: Element)
    {
        val longitude = ePoint.getAttribute("longitude")
        val latitude = ePoint.getAttribute("latitude")
        description = ePoint.getAttribute("description")
        code = ePoint.getAttribute("code")



        try
        {
            this.longitude = java.lang.Double.valueOf(longitude)
            this.latitude = java.lang.Double.valueOf(latitude)
            isValid = true
        }
        catch (ex: NumberFormatException)
        {
            ex.printStackTrace()
        }
    }


    companion object
    {
        private const val serialVersionUID: Long = 1
    }
}