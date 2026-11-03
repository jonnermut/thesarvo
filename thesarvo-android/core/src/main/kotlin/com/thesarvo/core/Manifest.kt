package com.thesarvo.core

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive

/** The app pack manifest (`app/v1/manifest.json`), written by thesarvo-3's `build-app-pack`. Mirrors `src/app/manifest.ts`. */
@Serializable
data class AppFile(val p: String, val h: String, val z: Int, val c: String)

/** A variant's `[hash, size]`. */
@Serializable(with = VariantRefSerializer::class)
data class VariantRef(val hash: String, val size: Int)

object VariantRefSerializer : KSerializer<VariantRef> {
    override val descriptor: SerialDescriptor = JsonElement.serializer().descriptor

    override fun deserialize(decoder: Decoder): VariantRef {
        val a = (decoder as JsonDecoder).decodeJsonElement() as JsonArray
        return VariantRef(a[0].jsonPrimitive.content, a[1].jsonPrimitive.int)
    }

    override fun serialize(encoder: Encoder, value: VariantRef) {
        (encoder as JsonEncoder).encodeJsonElement(JsonArray(listOf(JsonPrimitive(value.hash), JsonPrimitive(value.size))))
    }
}

enum class Variant { S, M, L;
    val key get() = name.lowercase()

    companion object {
        fun of(key: String?): Variant? = entries.firstOrNull { it.key == key }
    }
}

@Serializable
data class AppImage(val g: String, val n: String, val x: String, val s: VariantRef? = null, val m: VariantRef? = null, val l: VariantRef? = null) {
    fun variant(v: Variant): VariantRef? = when (v) { Variant.S -> s; Variant.M -> m; Variant.L -> l }
}

@Serializable
data class AppManifest(
    val schema: Int,
    val contentCommit: String,
    val builtAt: String,
    val minShell: Int,
    val bridge: Int,
    val files: List<AppFile>,
    val images: List<AppImage>,
)

/** Which guides get a variant: all, none, or a list of guide ids. */
@Serializable(with = SelectionSerializer::class)
sealed interface Selection {
    data object All : Selection
    data object None : Selection
    data class Guides(val ids: Set<String>) : Selection

    fun wants(guide: String): Boolean = when (this) { All -> true; None -> false; is Guides -> guide in ids }
}

object SelectionSerializer : KSerializer<Selection> {
    override val descriptor: SerialDescriptor = JsonElement.serializer().descriptor

    override fun deserialize(decoder: Decoder): Selection {
        val e = (decoder as JsonDecoder).decodeJsonElement()
        if (e is JsonArray) return Selection.Guides(e.map { it.jsonPrimitive.content }.toSet())
        return if (e.jsonPrimitive.booleanOrNull == true) Selection.All else Selection.None
    }

    override fun serialize(encoder: Encoder, value: Selection) {
        val e: JsonElement = when (value) {
            Selection.All -> JsonPrimitive(true)
            Selection.None -> JsonPrimitive(false)
            is Selection.Guides -> JsonArray(value.ids.sorted().map { JsonPrimitive(it) })
        }
        (encoder as JsonEncoder).encodeJsonElement(e)
    }
}

@Serializable
data class Policy(val s: Selection, val m: Selection, val l: Selection) {
    fun selection(v: Variant): Selection = when (v) { Variant.S -> s; Variant.M -> m; Variant.L -> l }

    companion object {
        val thumbnails = Policy(Selection.All, Selection.None, Selection.None)
        val allPhotos = Policy(Selection.All, Selection.All, Selection.None)
        val fullQuality = Policy(Selection.All, Selection.All, Selection.All)
    }
}

data class Download(
    /** The file's category (`shell`, `data`, `html`) or the image variant (`s`, `m`, `l`). */
    val kind: String,
    val path: String,
    val hash: String,
    val size: Int,
) {
    val isText get() = kind == "shell" || kind == "data" || kind == "html"
}

data class GenerationImage(val x: String, val s: String? = null, val m: String? = null, val l: String? = null) {
    fun hash(v: Variant): String? = when (v) { Variant.S -> s; Variant.M -> m; Variant.L -> l }
}

/** The path index the site handler serves from: URL path to blob hash, and `<guide>/<name>` to image variant hashes. */
class GenerationIndex(
    val paths: Map<String, String> = emptyMap(),
    val images: Map<String, GenerationImage> = emptyMap(),
)

/** The pure sync core (no I/O): the same answers as `src/app/syncPlan.ts`, checked against the shared vectors. */
object SyncPlan {
    private val order = listOf("shell", "data", "html", "s", "m", "l")

    fun wanted(manifest: AppManifest, policy: Policy): List<Download> {
        val out = manifest.files.mapTo(ArrayList()) { Download(it.c, it.p, it.h, it.z) }
        for (im in manifest.images) for (v in Variant.entries) {
            val e = im.variant(v) ?: continue
            if (policy.selection(v).wants(im.g)) out += Download(v.key, "images-app/${e.hash}", e.hash, e.size)
        }
        return out
    }

    data class Diff(val downloads: List<Download>, val deletions: List<String>)

    fun diff(manifest: AppManifest, present: Set<String>, policy: Policy): Diff {
        val seen = HashSet<String>()
        val downloads = wanted(manifest, policy).filter { it.hash !in present && seen.add(it.hash) }
        // sortedBy is stable, so the manifest's order is kept inside a kind.
        val ranked = downloads.sortedBy { order.indexOf(it.kind).let { i -> if (i < 0) 99 else i } }
        val listed = wanted(manifest, Policy.fullQuality).mapTo(HashSet()) { it.hash }
        return Diff(ranked, (present - listed).sorted())
    }

    fun generation(manifest: AppManifest, present: Set<String>): GenerationIndex {
        val paths = HashMap<String, String>()
        for (f in manifest.files) if (f.h in present) paths["/" + f.p] = f.h
        val images = HashMap<String, GenerationImage>()
        for (im in manifest.images) {
            fun pick(v: Variant) = im.variant(v)?.hash?.takeIf { it in present }
            val s = pick(Variant.S)
            val m = pick(Variant.M)
            val l = pick(Variant.L)
            if (s != null || m != null || l != null) images["${im.g}/${im.n}"] = GenerationImage(im.x, s, m, l)
        }
        return GenerationIndex(paths, images)
    }

    fun textComplete(manifest: AppManifest, present: Set<String>): Boolean = manifest.files.all { it.h in present }
}
