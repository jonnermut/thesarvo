package com.thesarvo.core

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** The shared sync vectors (thesarvo-3/test-vectors/sync): the same cases the web and iOS suites run. */
class VectorsTest {
    private val dir = File(System.getProperty("vectors.dir") ?: error("vectors.dir not set"))
    private val json = Json { ignoreUnknownKeys = true }

    private fun load(name: String): JsonArray {
        val f = File(dir, name)
        assertTrue("shared vectors missing: $f", f.exists())
        return json.parseToJsonElement(f.readText()).jsonArray
    }

    @Test
    fun allCasesMatch() {
        val inputs = load("inputs.json")
        val expected = load("expected.json")
        assertEquals(expected.size, inputs.size)
        assertTrue(inputs.size >= 5)
        for (i in inputs.indices) {
            val input = inputs[i].jsonObject
            val want = expected[i].jsonObject
            val name = input["name"]!!.jsonPrimitive.content
            assertEquals(name, want["name"]!!.jsonPrimitive.content)
            val manifest = json.decodeFromJsonElement(AppManifest.serializer(), input["manifest"]!!)
            val present = input["present"]!!.jsonArray.map { it.jsonPrimitive.content }.toSet()
            val policy = json.decodeFromJsonElement(Policy.serializer(), input["policy"]!!)
            val d = SyncPlan.diff(manifest, present, policy)
            val wantDownloads = want["downloads"]!!.jsonArray.map { it.jsonArray }.map { Triple(it[0].jsonPrimitive.content, it[1].jsonPrimitive.content, it[2].jsonPrimitive.int) }
            assertEquals("$name: downloads", wantDownloads, d.downloads.map { Triple(it.kind, it.path, it.size) })
            assertEquals("$name: deletions", want["deletions"]!!.jsonPrimitive.int, d.deletions.size)
            assertEquals("$name: textComplete", want["textComplete"]!!.jsonPrimitive.boolean, SyncPlan.textComplete(manifest, present))
            assertEquals("$name: pathsInGeneration", want["pathsInGeneration"]!!.jsonPrimitive.int, SyncPlan.generation(manifest, present).paths.size)
        }
    }
}
