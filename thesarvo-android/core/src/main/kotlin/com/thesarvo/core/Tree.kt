package com.thesarvo.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

data class TreeNode(
    val id: String,
    val parent: String?,
    val title: String,
    val path: String,
    val isGuide: Boolean,
    val climbs: Int,
    val children: List<TreeNode> = emptyList(),
) {
    /** The page URL path for this node. */
    val url get() = if (path.isEmpty()) "/g/" else "/g/$path"
}

@Serializable
private data class RawStats(val total: Int? = null)

@Serializable
private data class RawNode(val id: String, val parent: String? = null, val title: String, val path: String, val isGuide: Boolean, val stats: RawStats? = null)

@Serializable
private data class RawManifest(val nodes: List<RawNode>)

class Tree(val roots: List<TreeNode>, val byId: Map<String, TreeNode>) {
    /** The node for a page URL path such as `/g/east/freycinet-coles-bay/`. */
    fun nodeForUrlPath(p: String): TreeNode? {
        var path = p.substringBefore('?')
        if (path.startsWith("/g")) path = path.drop(2)
        path = path.trim('/')
        return byId.values.firstOrNull { it.path == path }
    }

    /** The names of a node's ancestors below the top (widest first), then its own: "South East", "Eldon". */
    fun areaNames(id: String): List<String> {
        val out = ArrayList<String>()
        var n = byId[id]
        while (n != null && n.path.isNotEmpty()) { out.add(0, n.title); n = n.parent?.let { byId[it] } }
        return out
    }

    /** The menu level that shows this page: the page's own children when it has some, else its parent's. */
    fun folder(id: String?): String? {
        val n = id?.let { byId[it] } ?: return null
        val f = if (n.children.isNotEmpty()) n.id else n.parent
        val fn = f?.let { byId[it] } ?: return null
        return if (fn.path.isEmpty()) null else f
    }

    /** Opens a guide; a point's `place` (its KML folder) opens the page of that name below the guide when there is one. */
    fun nodeForPlace(id: String, place: String): TreeNode? {
        val n = byId[id] ?: return null
        fun find(node: TreeNode): TreeNode? {
            for (c in node.children) {
                if (c.title.equals(place, ignoreCase = true)) return c
                find(c)?.let { return it }
            }
            return null
        }
        return if (place.isEmpty()) n else find(n) ?: n
    }

    /** Titles containing the query, shortest list first 60, as the menu's search. */
    fun search(query: String): List<TreeNode> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return emptyList()
        return byId.values.filter { it.title.lowercase().contains(q) && it.path.isNotEmpty() }.sortedBy { it.title }.take(60)
    }

    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        /** Builds the guide tree from `g-data/manifest.json`; the roots are the top node's children. */
        fun parse(data: String): Tree? {
            val raw = try { json.decodeFromString<RawManifest>(data) } catch (e: Exception) { return null }
            val kids = HashMap<String, MutableList<String>>()
            val flat = HashMap<String, RawNode>()
            var rootId: String? = null
            for (n in raw.nodes) {
                flat[n.id] = n
                if (n.parent != null) kids.getOrPut(n.parent) { ArrayList() }.add(n.id) else rootId = n.id
            }
            val byId = HashMap<String, TreeNode>()
            fun build(id: String): TreeNode {
                val n = flat.getValue(id)
                val node = TreeNode(n.id, n.parent, n.title, n.path, n.isGuide, n.stats?.total ?: 0, (kids[id] ?: emptyList<String>()).filter { it in flat }.map(::build))
                byId[id] = node
                return node
            }
            val root = rootId ?: return null
            return Tree(build(root).children, byId)
        }
    }
}

/** One line of a guide's contents, sent by the page (`openContents`). */
data class ContentsEntry(val anchor: String, val kind: String, val level: Int, val text: String, val number: String?, val grade: String?, val stars: String?) {
    val isClimb get() = kind == "climb"
}

object ContentsFilter {
    fun hasBoth(entries: List<ContentsEntry>) = entries.any { it.isClimb } && entries.any { !it.isClimb }

    fun shown(entries: List<ContentsEntry>, query: String, showClimbs: Boolean): List<ContentsEntry> {
        val q = query.trim().lowercase()
        val climbs = showClimbs || entries.none { !it.isClimb } || q.isNotEmpty()
        return entries.filter { e ->
            (!e.isClimb || climbs) && (q.isEmpty() || e.text.lowercase().contains(q) || (e.grade ?: "").lowercase().contains(q) || (q == "**" && (e.stars ?: "").length >= 2))
        }
    }
}
