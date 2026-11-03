package com.thesarvo.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

private const val HTML = "text/html; charset=utf-8"

class PathResolverTest {
    private val index = GenerationIndex(
        paths = mapOf("/g/index.html" to "h-home", "/g/east/index.html" to "h-east", "/assets/a.js" to "h-js", "/g/some page.html" to "h-sp"),
        images = mapOf("1/x.jpg" to GenerationImage("jpg", s = "s1", l = "l1"), "2/y.png" to GenerationImage("png", m = "m2")),
    )

    @Test fun exactPathAndMime() = assertEquals(Resolved.Blob("h-js", "text/javascript; charset=utf-8"), PathResolver.resolve("/assets/a.js", null, index))
    @Test fun directoryIndex() = assertEquals(Resolved.Blob("h-east", HTML), PathResolver.resolve("/g/east/", null, index))
    @Test fun directoryWithoutSlash() = assertEquals(Resolved.Blob("h-east", HTML), PathResolver.resolve("/g/east", null, index))
    @Test fun percentEncoded() = assertEquals(Resolved.Blob("h-sp", HTML), PathResolver.resolve("/g/some%20page.html", null, index))
    @Test fun imageVariantWanted() = assertEquals(Resolved.Blob("l1", "image/jpeg"), PathResolver.resolve("/images/1/x.jpg", "v=l", index))
    @Test fun imageFallsBackToLarger() = assertEquals(Resolved.Blob("l1", "image/jpeg"), PathResolver.resolve("/images/1/x.jpg", "v=m", index))
    @Test fun imageSmallFirstForS() = assertEquals(Resolved.Blob("s1", "image/jpeg"), PathResolver.resolve("/images/1/x.jpg", "v=s", index))
    @Test fun pngMime() = assertEquals(Resolved.Blob("m2", "image/png"), PathResolver.resolve("/images/2/y.png", "v=s", index))
    @Test fun missingImageGoesToProxy() = assertEquals(Resolved.Proxy, PathResolver.resolve("/images/9/z.jpg", "v=m", index))
    @Test fun apiAndDataGoToProxy() {
        assertEquals(Resolved.Proxy, PathResolver.resolve("/g/api/save", null, index))
        assertEquals(Resolved.Proxy, PathResolver.resolve("/g-data/nope.json", null, index))
        assertEquals(Resolved.Proxy, PathResolver.resolve("/private/x", null, index))
    }
    @Test fun unknownGPathServesShell() = assertEquals(Resolved.Blob("h-home", HTML), PathResolver.resolve("/g/search", null, index))
    @Test fun unknownAssetIsNotFound() = assertEquals(Resolved.NotFound, PathResolver.resolve("/nope.css", null, index))
    @Test fun variantOrders() {
        assertEquals(listOf(Variant.S, Variant.M, Variant.L), PathResolver.variantOrder(Variant.S))
        assertEquals(listOf(Variant.M, Variant.L, Variant.S), PathResolver.variantOrder(Variant.M))
        assertEquals(listOf(Variant.L, Variant.M, Variant.S), PathResolver.variantOrder(Variant.L))
    }
}

class PkceTest {
    @Test fun rfc7636Vector() = assertEquals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", Pkce.challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"))

    @Test fun verifierIsUrlSafeAndLongEnough() {
        val v = Pkce.verifier()
        assertTrue(v.length in 43..128)
        assertTrue(v.all { it.isLetterOrDigit() || it == '-' || it == '_' })
        assertTrue(Pkce.verifier() != v)
    }

    @Test fun authorizeUrl() {
        val u = Pkce.authorizeUrl(Pkce.DOMAIN, "cid", Pkce.REDIRECT, "st", "ch")
        assertTrue(u.startsWith("https://auth.thesarvo.com/oauth2/authorize?"))
        assertTrue("client_id=cid" in u && "response_type=code" in u && "code_challenge_method=S256" in u && "state=st" in u && "code_challenge=ch" in u)
        assertTrue("scope=openid%20email%20profile%20aws.cognito.signin.user.admin" in u)
        assertTrue("redirect_uri=thesarvo%3A%2F%2Fauth%2Fcallback" in u)
    }

    @Test fun logoutUrl() = assertEquals("https://auth.thesarvo.com/logout?client_id=cid&logout_uri=thesarvo%3A%2F%2Fauth%2Fsignout", Pkce.logoutUrl(Pkce.DOMAIN, "cid", Pkce.SIGNED_OUT))

    @Test fun goodCallback() = assertEquals("abc", Pkce.code("thesarvo://auth/callback?code=abc&state=s1", "s1"))

    private fun fails(url: String, state: String, message: String? = null) {
        try { Pkce.code(url, state); fail("expected failure for $url") } catch (e: AuthException) { if (message != null) assertEquals(message, e.message) }
    }

    @Test fun wrongState() = fails("thesarvo://auth/callback?code=abc&state=zzz", "s1")
    @Test fun missingState() = fails("thesarvo://auth/callback?code=abc", "s1")
    @Test fun missingCode() = fails("thesarvo://auth/callback?state=s1", "s1")
    @Test fun cognitoError() = fails("thesarvo://auth/callback?error=access_denied&error_description=User+cancelled", "s1", "User cancelled")

    @Test fun userFromToken() {
        val payload = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("""{"email":"a@b.c","name":"Ann","cognito:groups":["editors"]}""".toByteArray())
        val u = Pkce.user("x.$payload.y")!!
        assertEquals("a@b.c", u.email)
        assertEquals("Ann", u.name)
        assertTrue(u.canEdit)
        assertNull(Pkce.user("garbage"))
    }
}

class TreeTest {
    private val data = """{"nodes":[
      {"id":"root","parent":null,"title":"Root","path":"","isGuide":false},
      {"id":"east","parent":"root","title":"East","path":"east","isGuide":false,"stats":{"total":10}},
      {"id":"fr","parent":"east","title":"Freycinet","path":"east/freycinet","isGuide":true,"stats":{"total":7}},
      {"id":"bo","parent":"root","title":"Bouldering","path":"bouldering","isGuide":false},
      {"id":"ho","parent":"bo","title":"Hobart","path":"bouldering/hobart","isGuide":true}]}"""

    @Test fun parsesTree() {
        val t = Tree.parse(data)!!
        assertEquals(listOf("East", "Bouldering"), t.roots.map { it.title })
        assertEquals(7, t.byId["fr"]!!.climbs)
        assertEquals("/g/east/freycinet", t.byId["fr"]!!.url)
    }

    @Test fun nodeForUrl() {
        val t = Tree.parse(data)!!
        assertEquals("fr", t.nodeForUrlPath("/g/east/freycinet/?edit=true")!!.id)
        assertNull(t.nodeForUrlPath("/g/none"))
    }

    @Test fun areasAndFolders() {
        val t = Tree.parse(data)!!
        assertEquals(listOf("East", "Freycinet"), t.areaNames("fr"))
        assertEquals("east", t.folder("fr"))
        assertEquals("east", t.folder("east"))
        assertNull(t.folder(null))
    }

    @Test fun searchAndPlaces() {
        val t = Tree.parse(data)!!
        assertEquals(listOf("Freycinet"), t.search(" freyc ").map { it.title })
        assertTrue(t.search("").isEmpty())
        assertEquals("fr", t.nodeForPlace("east", "FREYCINET")!!.id)
        assertEquals("east", t.nodeForPlace("east", "Unknown")!!.id)
    }

    @Test fun badJsonIsNull() = assertNull(Tree.parse("not json"))
}

class ContentsFilterTest {
    private val entries = listOf(
        ContentsEntry("h1", "heading", 0, "Gordon Gorge", null, null, null),
        ContentsEntry("c1", "climb", 1, "Silver Surfer", "1", "21", "**"),
        ContentsEntry("c2", "climb", 1, "Plain", "2", "12", ""),
    )

    @Test fun headingsOnlyByDefault() = assertEquals(listOf("h1"), ContentsFilter.shown(entries, "", false).map { it.anchor })
    @Test fun climbsToggle() = assertEquals(3, ContentsFilter.shown(entries, "", true).size)
    @Test fun queryShowsClimbs() = assertEquals(listOf("c1"), ContentsFilter.shown(entries, "silver", false).map { it.anchor })
    @Test fun gradeMatch() = assertEquals(listOf("c2"), ContentsFilter.shown(entries, "12", false).map { it.anchor })
    @Test fun starsFilter() = assertEquals(listOf("c1"), ContentsFilter.shown(entries, "**", false).map { it.anchor })
    @Test fun hasBoth() { assertTrue(ContentsFilter.hasBoth(entries)); assertTrue(!ContentsFilter.hasBoth(entries.drop(1))) }
}

class MapTest {
    private val kml = """<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Doc</name>
      <Folder><name>Gordon Gorge</name><Placemark><name>Main Wall</name><Point><coordinates>146.5,-42.7,0</coordinates></Point></Placemark></Folder>
      <Placemark><name>Loose</name><Point><coordinates>147.0,-43.0</coordinates></Point></Placemark></Document></kml>"""

    @Test fun parsesKml() {
        val p = KmlParser.parse(kml.toByteArray(), "g1")
        assertEquals(2, p.size)
        assertEquals("Main Wall", p[0].title)
        assertEquals("Gordon Gorge", p[0].subtitle)
        assertEquals(-42.7, p[0].latitude, 1e-9)
        assertEquals(146.5, p[0].longitude, 1e-9)
        assertEquals("Doc", p[1].subtitle)
        assertEquals("Gordon Gorge · -42.70000, 146.50000", p[0].detail)
    }

    @Test fun refusesDoctype() {
        val bad = """<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><kml><Document/></kml>"""
        try { KmlParser.parse(bad.toByteArray(), "g"); fail("doctype accepted") } catch (e: Exception) { /* expected */ }
    }

    @Test fun dedupeKeepsMostSpecific() {
        val a = CragPoint("region-0", "region", "T", "", -42.0, 146.0)
        val b = CragPoint("crag-0", "crag", "T", "", -42.00001, 146.00001)
        val kept = KmlParser.dedupe(listOf(a, b)) { if (it == "crag") 3 else 1 }
        assertEquals(listOf("crag-0"), kept.map { it.id })
    }

    @Test fun clusterNames() {
        assertEquals("Gordon Gorge", ClusterName.label(listOf(listOf("South", "Gordon Gorge"), listOf("South", "Gordon Gorge"))))
        assertEquals("Gordon Gorge +1", ClusterName.label(listOf(listOf("South", "Gordon Gorge"), listOf("South", "Gordon Gorge"), listOf("South", "Eldon"))))
        assertEquals("Hobart bouldering", ClusterName.label(listOf(listOf("Bouldering", "Hobart"), listOf("Bouldering", "Hobart"))))
        assertEquals("East", ClusterName.label((1..6).map { listOf("East", "Crag $it") }))
        assertNull(ClusterName.label(emptyList()))
    }

    @Test fun clustersOnlyZoomedOut() {
        val pts = listOf(CragPoint("a", "g", "A", "", -42.0, 146.0), CragPoint("b", "g", "B", "", -42.001, 146.001), CragPoint("c", "g", "C", "", -43.5, 147.5))
        val close = ClusterEngine.build(pts, 0.05, { listOf("X") })
        assertEquals(3, close.size)
        assertTrue(close.all { it is MapItem.Single })
        val far = ClusterEngine.build(pts, 5.0, { listOf("X") })
        assertEquals(2, far.size)
        assertEquals("X", far.filterIsInstance<MapItem.Cluster>().single().title)
    }

    @Test fun directions() {
        val t = DirectionsTarget.all(-42.5, 146.25, "Gordon Gorge")
        assertEquals(listOf("Google Maps", "Waze", "Other map apps"), t.map { it.name })
        assertTrue("destination=-42.500000,146.250000" in t[0].url)
        assertTrue(t[2].url.startsWith("geo:-42.500000,146.250000?q="))
    }
}

class QueueAndBridgeTest {
    @Test fun guideIdFromBody() {
        assertEquals("g1", EditQueueFormat.guideId("""{"guide":"g1","x":1}"""))
        assertNull(EditQueueFormat.guideId("""{"guide":""}"""))
        assertNull(EditQueueFormat.guideId("nope"))
        assertNull(EditQueueFormat.guideId(null))
    }

    @Test fun fileNamesStayInside() = assertEquals("abc12.json", EditQueueFormat.fileName("../abc/12"))

    @Test fun sharedNames() {
        assertEquals("a-b-c.gpx", SharedFileName.clean("a/b:c.gpx"))
        assertEquals("guide.gpx", SharedFileName.clean("..."))
        assertEquals("application/gpx+xml", SharedFileName.mime("x.gpx"))
        assertEquals("application/vnd.google-earth.kml+xml", SharedFileName.mime("x.kml"))
    }

    @Test fun apiMessage() {
        val m = BridgeMessage.parse("""{"type":"api","id":7,"method":"post","path":"/g/api/save","headers":{"content-type":"application/json"},"body":"{}"}""") as BridgeMessage.Api
        assertEquals(7, m.id)
        assertEquals("POST", m.method)
        assertEquals("{}", m.body)
        assertEquals("application/json", m.headers["content-type"])
    }

    @Test fun apiPathMustBeApi() {
        assertNull(BridgeMessage.parse("""{"type":"api","id":1,"path":"/other"}"""))
        assertNull(BridgeMessage.parse("""{"type":"api","path":"/g/api/x"}"""))
    }

    @Test fun otherMessages() {
        assertEquals(BridgeMessage.BootOk, BridgeMessage.parse("""{"type":"bootOK"}"""))
        assertEquals(BridgeMessage.ContentsAvailable(true), BridgeMessage.parse("""{"type":"contentsAvailable","available":true}"""))
        assertEquals(BridgeMessage.OpenExternal("https://x"), BridgeMessage.parse("""{"type":"openExternal","url":"https://x"}"""))
        val map = BridgeMessage.parse("""{"type":"openMap","guide":"g","points":[{"title":"A","lat":-42.1,"lon":146.2},{"title":"bad"}]}""") as BridgeMessage.OpenMap
        assertEquals(1, map.points.size)
        assertEquals("page-g-0", map.points[0].id)
        val c = BridgeMessage.parse("""{"type":"openContents","entries":[{"anchor":"a","text":"T","kind":"climb","level":1,"grade":"20"},{"text":"no anchor"}]}""") as BridgeMessage.OpenContents
        assertEquals(1, c.entries.size)
        assertTrue(c.entries[0].isClimb)
        val s = BridgeMessage.parse("""{"type":"shareFile","name":"a.gpx","text":"<gpx/>"}""") as BridgeMessage.ShareFile
        assertEquals("a.gpx", s.name)
        assertNull(BridgeMessage.parse("not json"))
        assertNull(BridgeMessage.parse("""{"type":"unknown"}"""))
    }
}

class ManifestTest {
    private val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

    @Test fun policyRoundTrip() {
        val p = Policy(Selection.All, Selection.Guides(setOf("b", "a")), Selection.None)
        val s = json.encodeToString(Policy.serializer(), p)
        assertEquals("""{"s":true,"m":["a","b"],"l":false}""", s)
        assertEquals(p, json.decodeFromString(Policy.serializer(), s))
    }

    @Test fun variantRefIsAnArray() {
        val i = json.decodeFromString(AppImage.serializer(), """{"g":"1","n":"a.jpg","x":"jpg","s":["h1",5]}""")
        assertEquals(VariantRef("h1", 5), i.s)
        assertNull(i.m)
    }

    private fun manifest(files: List<AppFile>, images: List<AppImage> = emptyList()) = AppManifest(1, "c", "t", 1, 1, files, images)

    @Test fun guideListSelectionAndDedupe() {
        val m = manifest(emptyList(), listOf(AppImage("1", "a.jpg", "jpg", s = VariantRef("s1", 1), m = VariantRef("shared", 2)), AppImage("2", "b.jpg", "jpg", m = VariantRef("shared", 2))))
        val d = SyncPlan.diff(m, emptySet(), Policy(Selection.None, Selection.Guides(setOf("1", "2")), Selection.None))
        assertEquals(1, d.downloads.size)
    }

    @Test fun deletesWhatNoVariantListsAnymore() {
        val m = manifest(listOf(AppFile("a", "ha", 1, "data")))
        val d = SyncPlan.diff(m, setOf("ha", "old1", "old2"), Policy.thumbnails)
        assertTrue(d.downloads.isEmpty())
        assertEquals(listOf("old1", "old2"), d.deletions)
    }

    @Test fun textSortsBeforePhotosAndKeepsOrder() {
        val m = manifest(
            listOf(AppFile("h.html", "h3", 1, "html"), AppFile("s.js", "h1", 1, "shell"), AppFile("d.json", "h2", 1, "data")),
            listOf(AppImage("1", "a.jpg", "jpg", s = VariantRef("p1", 1), l = VariantRef("p2", 1))),
        )
        val d = SyncPlan.diff(m, emptySet(), Policy.fullQuality)
        assertEquals(listOf("shell", "data", "html", "s", "l"), d.downloads.map { it.kind })
    }
}
