package com.thesarvo.guide.store

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class BlobStoreTest {
    @get:Rule val tmp = TemporaryFolder()

    private fun store() = BlobStore(tmp.newFolder("store"))

    @Test fun putKeepsOnlyBytesThatMatchTheHash() {
        val s = store()
        val data = "hello".toByteArray()
        val hash = Hashing.sha256(data)
        val t = s.newTemp().also { it.writeBytes(data) }
        s.put(t, hash)
        assertTrue(s.hasStored(hash))
        assertEquals("hello", s.readBytes(hash)?.decodeToString())

        val bad = s.newTemp().also { it.writeBytes("other".toByteArray()) }
        try { s.put(bad, "0".repeat(64)); fail("expected a hash mismatch") } catch (e: HashMismatch) { }
        assertFalse(bad.exists())
        assertFalse(s.hasStored("0".repeat(64)))
    }

    @Test fun promotingTheCandidateKeepsTheOldCurrentAsPrevious() {
        val s = store()
        s.saveManifest("""{"schema":1,"contentCommit":"a","builtAt":"1","minShell":1,"bridge":1,"files":[],"images":[]}""".toByteArray(), "current")
        s.saveManifest("""{"schema":1,"contentCommit":"b","builtAt":"2","minShell":1,"bridge":1,"files":[],"images":[]}""".toByteArray(), "candidate")
        s.promoteCandidate()
        assertEquals("b", s.loadManifest("current")?.contentCommit)
        assertEquals("a", s.loadManifest("previous")?.contentCommit)
        assertNull(s.loadManifest("candidate"))
    }

    @Test fun wipeEmptiesTheStoreButItStillWorks() {
        val s = store()
        val hash = Hashing.sha256("x".toByteArray())
        s.put(s.newTemp().also { it.writeBytes("x".toByteArray()) }, hash)
        s.wipe()
        assertTrue(s.storedHashes().isEmpty())
        s.put(s.newTemp().also { it.writeBytes("x".toByteArray()) }, hash)
        assertTrue(s.hasStored(hash))
    }

    @Test fun stateRoundTrips() {
        val s = store()
        s.saveState(StoreState(etag = "\"e\"", lastCheck = 5, bootPending = true))
        assertEquals(StoreState("\"e\"", 5, true), s.loadState())
        s.updateState { it.copy(bootPending = false) }
        assertFalse(s.loadState().bootPending)
    }
}

class PrivateStoreTest {
    @get:Rule val tmp = TemporaryFolder()

    private val manifest = """{"schema":1,"pages":{"cct":{"title":"CCT"}},"grafts":[{"id":"cct"}],"images":[{"g":"cct","n":"a b.jpg","u":"https://x/y"}]}"""

    @Test fun rejectsAManifestThatIsNotOurs() {
        val p = PrivateStore(tmp.newFolder("a"))
        try { p.save("""{"schema":2,"pages":{}}"""); fail("expected a rejection") } catch (e: HashMismatch) { }
        try { p.save("not json"); fail("expected a rejection") } catch (e: HashMismatch) { }
        assertFalse(p.isFilled)
    }

    @Test fun answersPrivateCallsOfflineWithLocalPhotoLinks() {
        val p = PrivateStore(tmp.newFolder("b"))
        p.save(manifest)
        assertTrue(p.isFilled)
        assertEquals("""[{"id":"cct"}]""", p.offlineAnswer("/g/api/private-tree")?.body)
        assertNull(p.offlineAnswer("/g/api/private?id=nope"))
        assertNull(p.offlineAnswer("/g/api/other"))

        val photo = p.photos().single()
        assertFalse(p.hasImage(photo))
        p.putImage(File(tmp.root, "t.jpg").also { it.writeBytes(byteArrayOf(1, 2, 3)) }, photo)
        assertTrue(p.hasImage(photo))
        val page = p.offlineAnswer("/g/api/private?id=cct")?.body
        assertNotNull(page)
        assertTrue(page!!.contains("/private-images/cct/a%20b.jpg"))
        assertNotNull(p.imageFile("/private-images/cct/a%20b.jpg"))
        assertNull(p.imageFile("/images/cct/a.jpg"))
    }

    @Test fun wipeRemovesEverything() {
        val p = PrivateStore(tmp.newFolder("c"))
        p.save(manifest)
        p.wipe()
        assertFalse(p.isFilled)
    }
}

class EditQueueTest {
    @get:Rule val tmp = TemporaryFolder()

    @Test fun keepsOneEntryPerGuideNewestWinsAndOldestFirst() {
        val q = EditQueue(tmp.newFolder("q"))
        q.enqueue("b-guide", "a@x.com", "one", now = 10)
        q.enqueue("a-guide", "a@x.com", "two", now = 5)
        q.enqueue("b-guide", "a@x.com", "three", now = 20)
        val p = q.pending()
        assertEquals(listOf("a-guide", "b-guide"), p.map { it.guide })
        assertEquals("three", p.last().body)
        q.remove("a-guide")
        assertEquals(1, q.pending().size)
    }
}
