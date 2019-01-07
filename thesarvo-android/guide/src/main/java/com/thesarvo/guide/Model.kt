package com.thesarvo.guide

import com.fasterxml.jackson.databind.ObjectMapper
import java.util.*

/**
 * Created by jon on 25/01/14.
 */
class Model
{

    val excludePages: List<Long> = listOf(
            11370498, // Buy and download guides
            13467650, // Hardcopy Guides
            14450710, // Guide Manual
            330433081, // The Rookeries
            1147, //Additional Topos and Maps
            1148, // Articles
            1516, // Mt Wellington Guide Feedback
            2883716, // Mt Wellington Updates
            276267033, // Pipes Guide To Do
            9404496 // GPS

    // MAKE SURE YOU UPDATE THE SAME LIST in Model.swift !!!
    )

    var guides: MutableMap<String, Guide> = LinkedHashMap()

    lateinit var rootGuide: Guide


    fun startup()
    {

        val om = ObjectMapper()
        val stream = ResourceManager.get().getDataAsset("index.json")
        rootGuide = om.readValue(stream, Guide::class.java)

        val extraStream = ResourceManager.get().getWWWAsset("www/index-extra.json")
        val extras = om.readValue(extraStream, Guide::class.java)
        rootGuide.children.addAll(extras.children)


        process(rootGuide)
    }

    fun process(guide: Guide)
    {
        guides[guide.viewIdOrId] = guide

        if (guide.title.endsWith(" bouldering"))
        {
            guide.title = guide.title.removeSuffix(" bouldering")
        }
        if (guide.title == "The Tasmanian Bouldering Guide")
        {
            guide.title = "Bouldering"
        }

        guide.children = ArrayList<Guide>(
                guide.children.filter {
                    !excludePages.contains(it.id)
                    && !it.title.toLowerCase().contains("gallery")
            })


        for (c in guide.children)
        {
            process(c)
        }
    }


    init
    {
    }

    fun getGuide(id: String): Guide?
    {
        return guides.get(id)
    }


    companion object
    {
        private val instance = Model()

        fun get(): Model
        {
            return instance
        }
    }
}
