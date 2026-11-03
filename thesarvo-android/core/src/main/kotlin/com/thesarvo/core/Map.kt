package com.thesarvo.core

import java.util.Locale
import javax.xml.parsers.SAXParserFactory
import org.xml.sax.Attributes
import org.xml.sax.InputSource
import org.xml.sax.helpers.DefaultHandler

data class CragPoint(val id: String, val guideId: String, val title: String, val subtitle: String, val latitude: Double, val longitude: Double) {
    /** The guide or folder, then the coordinates (the old app showed them in the callout). */
    val detail get() = listOf(subtitle, String.format(Locale.US, "%.5f, %.5f", latitude, longitude)).filter { it.isNotEmpty() }.joinToString(" · ")
}

/** Reads the crag points from a guide's KML (`g-data/kml/<guide id>.kml`): Placemarks with Point coordinates, inside optional Folders. */
object KmlParser {
    fun parse(xml: ByteArray, guideId: String): List<CragPoint> {
        val points = ArrayList<CragPoint>()
        val stack = ArrayList<String>()
        val folders = ArrayList<String>()
        val text = StringBuilder()
        var docName = ""
        var placemarkName = ""
        var inPlacemark = false
        val factory = SAXParserFactory.newInstance()
        // KML never needs entities or a DTD; refusing them keeps a hostile file from fetching anything.
        runCatching { factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true) }
        factory.newSAXParser().parse(InputSource(xml.inputStream()), object : DefaultHandler() {
            override fun startElement(uri: String?, localName: String?, qName: String, attributes: Attributes?) {
                val name = qName.substringAfter(':')
                stack.add(name)
                text.setLength(0)
                if (name == "Placemark") { inPlacemark = true; placemarkName = "" }
                if (name == "Folder") folders.add("")
            }

            override fun characters(ch: CharArray, start: Int, length: Int) { text.append(ch, start, length) }

            override fun endElement(uri: String?, localName: String?, qName: String) {
                val name = qName.substringAfter(':')
                val t = text.toString().trim()
                val parent = stack.getOrNull(stack.size - 2)
                when (name) {
                    "name" -> if (inPlacemark) placemarkName = t else if (parent == "Folder") folders[folders.size - 1] = t else if (parent == "Document") docName = t
                    "coordinates" -> if (inPlacemark) {
                        val parts = t.split(',').mapNotNull { it.trim().toDoubleOrNull() }
                        if (parts.size >= 2) points.add(CragPoint("$guideId-${points.size}", guideId, placemarkName, folders.lastOrNull { it.isNotEmpty() } ?: docName, parts[1], parts[0]))
                    }
                    "Placemark" -> inPlacemark = false
                    "Folder" -> if (folders.isNotEmpty()) folders.removeAt(folders.size - 1)
                }
                if (stack.isNotEmpty()) stack.removeAt(stack.size - 1)
                text.setLength(0)
            }
        })
        return points
    }

    /**
     * A folder's file repeats the points of everything under it: keep each one under its most specific guide
     * (the one with the deepest area chain), as the iOS map does.
     */
    fun dedupe(all: List<CragPoint>, depthOf: (String) -> Int): List<CragPoint> {
        fun key(p: CragPoint) = String.format(Locale.US, "%.4f,%.4f", p.latitude, p.longitude)
        val best = HashMap<String, CragPoint>()
        val depth = HashMap<String, Int>()
        for (p in all) {
            val d = depth.getOrPut(p.guideId) { depthOf(p.guideId) }
            val old = best[key(p)]
            if (old != null && (depth[old.guideId] ?: 0) >= d) continue
            best[key(p)] = p
        }
        return all.filter { best[key(it)]?.id == it.id }
    }
}

object ClusterName {
    /** The deepest area all the chains share, else the most common widest area; null when none are known. */
    fun label(chainsIn: List<List<String>>): String? {
        // "Bouldering" is a section holding regions (Hobart, North...), so name those instead: "Hobart bouldering".
        val chains = chainsIn.filter { it.isNotEmpty() }.map { c -> if (c.size > 1 && c[0] == "Bouldering") listOf("${c[1]} bouldering") + c.drop(2) else c }
        // A few guides: the biggest one's name, "Eldon +2". Many: the area they share, below.
        val counts0 = chains.groupingBy { it }.eachCount()
        if (counts0.size <= 4) {
            val top = counts0.entries.maxWithOrNull(compareBy<Map.Entry<List<String>, Int>>({ it.value }, { it.key.lastOrNull() ?: "" }))?.key?.lastOrNull()
            if (top != null) return if (counts0.size == 1) top else "$top +${counts0.size - 1}"
        }
        var common = chains.firstOrNull() ?: return null
        for (c in chains.drop(1)) common = common.zip(c).takeWhile { it.first == it.second }.map { it.first }
        common.lastOrNull()?.let { return it }
        val counts = chains.map { it[0] }.groupingBy { it }.eachCount()
        return counts.entries.maxWithOrNull(compareBy<Map.Entry<String, Int>>({ it.value }, { it.key }))?.key
    }
}

/** A map item: one crag, or a group of crags close together while zoomed out. */
sealed interface MapItem {
    data class Single(val point: CragPoint) : MapItem
    data class Cluster(val points: List<CragPoint>, val latitude: Double, val longitude: Double, val title: String) : MapItem
}

object ClusterEngine {
    /** Clusters only while zoomed out (the visible latitude span over this); close in, every crag shows on its own. */
    const val CLUSTER_SPAN = 0.06

    /** Grid clustering: a cell is the visible span divided by `cells`; a cell with more than one point becomes a cluster. */
    fun build(points: List<CragPoint>, latSpan: Double, chain: (CragPoint) -> List<String>, cells: Int = 9): List<MapItem> {
        if (latSpan <= CLUSTER_SPAN || points.size < 2) return points.map { MapItem.Single(it) }
        val cell = latSpan / cells
        val groups = LinkedHashMap<Pair<Long, Long>, MutableList<CragPoint>>()
        for (p in points) groups.getOrPut(Math.floorDiv((p.latitude * 1e6).toLong(), (cell * 1e6).toLong().coerceAtLeast(1)) to Math.floorDiv((p.longitude * 1e6).toLong(), (cell * 1e6).toLong().coerceAtLeast(1))) { ArrayList() }.add(p)
        return groups.values.map { g ->
            if (g.size == 1) MapItem.Single(g[0])
            else MapItem.Cluster(g, g.map { it.latitude }.average(), g.map { it.longitude }.average(), ClusterName.label(g.map(chain)) ?: "${g.size} crags")
        }
    }
}

/** Where to send a map point: the apps a climber is likely to use for directions (https links open the installed app). */
data class DirectionsTarget(val name: String, val url: String) {
    companion object {
        fun all(latitude: Double, longitude: Double, title: String): List<DirectionsTarget> {
            val ll = String.format(Locale.US, "%.6f,%.6f", latitude, longitude)
            val q = java.net.URLEncoder.encode(title, "UTF-8").replace("+", "%20")
            return listOf(
                DirectionsTarget("Google Maps", "https://www.google.com/maps/dir/?api=1&destination=$ll&travelmode=driving"),
                DirectionsTarget("Waze", "https://waze.com/ul?ll=$ll&navigate=yes"),
                DirectionsTarget("Other map apps", "geo:$ll?q=$ll($q)"),
            )
        }
    }
}
