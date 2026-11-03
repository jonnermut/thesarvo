package com.thesarvo.guide.store

import com.thesarvo.core.EditQueueFormat
import com.thesarvo.core.QueuedSave
import com.thesarvo.guide.sync.ApiClient
import java.io.File
import kotlinx.serialization.json.Json

/**
 * Saves the page could not send (no network), kept as files so the OS cannot evict them like web storage. One entry per guide: every
 * save request carries all the changes since the guide was last saved, so the newest one holds the older ones. An entry is dropped only
 * when the server took it (or a later save of that guide went through); sign-out and reset never touch it, and it is only sent for the
 * person who made it.
 */
class EditQueue(storeRoot: File) {
    private val dir = File(storeRoot, "edit-queue")
    private val json = Json { ignoreUnknownKeys = true }

    private fun file(guide: String) = File(dir, EditQueueFormat.fileName(guide))

    fun enqueue(guide: String, email: String, body: String, now: Long = System.currentTimeMillis()) {
        BlobStore.atomicWrite(file(guide), json.encodeToString(QueuedSave.serializer(), QueuedSave(guide, email, body, now)).toByteArray())
    }

    fun remove(guide: String) { file(guide).delete() }

    fun pending(): List<QueuedSave> =
        (dir.listFiles() ?: emptyArray()).filter { it.extension == "json" }.mapNotNull { f -> try { json.decodeFromString(QueuedSave.serializer(), f.readText()) } catch (e: Exception) { null } }.sortedBy { it.queuedAt }

    /** Sends what is waiting for [email]. Returns how many the server took. */
    suspend fun replay(email: String, idToken: String, api: ApiClient): Int {
        var sent = 0
        for (e in pending().filter { it.email == email }) {
            val a = api.perform("POST", EditQueueFormat.SAVE_PATH, mapOf("content-type" to "application/json"), e.body, idToken)
            if (a.status == 0) break // still offline: try later, keep the order
            if (a.status == 200) { remove(e.guide); sent++ }
        }
        return sent
    }
}
