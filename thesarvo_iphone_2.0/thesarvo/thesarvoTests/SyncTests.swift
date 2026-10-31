import XCTest
@testable import thesarvo

final class SyncVectorTests: XCTestCase {
    struct Case: Decodable {
        let name: String
        let manifest: AppManifest
        let present: [String]
        let policy: Policy
    }
    struct Expected: Decodable {
        let downloads: [[Value]]
        let deletions: Int
        let textComplete: Bool
        let pathsInGeneration: Int
    }
    enum Value: Decodable, Equatable {
        case s(String), i(Int)
        init(from d: Decoder) throws {
            let c = try d.singleValueContainer()
            if let i = try? c.decode(Int.self) { self = .i(i) } else { self = .s(try c.decode(String.self)) }
        }
    }

    private func vectors(_ name: String) throws -> Data {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("thesarvo-3/test-vectors/sync/\(name)")
        guard FileManager.default.fileExists(atPath: url.path) else { throw XCTSkip("shared sync vectors not checked out") }
        return try Data(contentsOf: url)
    }

    func testSharedVectors() throws {
        let cases = try JSONDecoder().decode([Case].self, from: vectors("inputs.json"))
        let expected = try JSONDecoder().decode([Expected].self, from: vectors("expected.json"))
        XCTAssertEqual(cases.count, expected.count)
        for (c, e) in zip(cases, expected) {
            let present = Set(c.present)
            let d = SyncPlan.diff(c.manifest, present: present, policy: c.policy)
            let got = d.downloads.map { [Value.s($0.kind), .s($0.path), .i($0.size)] }
            XCTAssertEqual(got, e.downloads, c.name)
            XCTAssertEqual(d.deletions.count, e.deletions, c.name)
            XCTAssertEqual(SyncPlan.textComplete(c.manifest, present: present), e.textComplete, c.name)
            XCTAssertEqual(SyncPlan.generation(c.manifest, present: present).paths.count, e.pathsInGeneration, c.name)
        }
    }
}

final class PathResolverTests: XCTestCase {
    private var index: GenerationIndex {
        var i = GenerationIndex()
        i.paths["/g/index.html"] = "h-home"
        i.paths["/g/east/index.html"] = "h-east"
        i.paths["/assets/a.js"] = "h-js"
        i.images["1/x.jpg"] = GenerationImage(x: "jpg", s: "hs", m: nil, l: "hl")
        return i
    }

    func testExactAndDirectory() {
        XCTAssertEqual(PathResolver.resolve(path: "/assets/a.js", query: nil, index: index), .blob(hash: "h-js", mime: "text/javascript; charset=utf-8"))
        XCTAssertEqual(PathResolver.resolve(path: "/g/east", query: nil, index: index), .blob(hash: "h-east", mime: "text/html; charset=utf-8"))
        XCTAssertEqual(PathResolver.resolve(path: "/g/east/", query: nil, index: index), .blob(hash: "h-east", mime: "text/html; charset=utf-8"))
    }

    func testImageVariantFallback() {
        XCTAssertEqual(PathResolver.resolve(path: "/images/1/x.jpg", query: nil, index: index), .blob(hash: "hl", mime: "image/jpeg"))
        XCTAssertEqual(PathResolver.resolve(path: "/images/1/x.jpg", query: "v=s", index: index), .blob(hash: "hs", mime: "image/jpeg"))
        XCTAssertEqual(PathResolver.resolve(path: "/images/9/none.jpg", query: nil, index: index), .proxy)
    }

    func testProxyFallbackAndNotFound() {
        XCTAssertEqual(PathResolver.resolve(path: "/g/api/me", query: nil, index: index), .proxy)
        XCTAssertEqual(PathResolver.resolve(path: "/g/new/route", query: nil, index: index), .blob(hash: "h-home", mime: "text/html; charset=utf-8"))
        XCTAssertEqual(PathResolver.resolve(path: "/nothing.png", query: nil, index: index), .notFound)
    }
}

final class TreeAndKMLTests: XCTestCase {
    func testTree() throws {
        let json = #"{"nodes":[{"id":"r","parent":null,"title":"Root","path":"","isGuide":false},{"id":"a","parent":"r","title":"East","path":"east","isGuide":false},{"id":"b","parent":"a","title":"Coles","path":"east/coles","isGuide":true,"stats":{"total":12}}]}"#
        let t = try XCTUnwrap(TreeLoader.parse(Data(json.utf8)))
        XCTAssertEqual(t.roots.map(\.title), ["East"])
        XCTAssertEqual(t.roots[0].children?.first?.climbs, 12)
        XCTAssertEqual(TreeLoader.node(forURLPath: "/g/east/coles/?x=1", in: t.byID)?.id, "b")
        XCTAssertEqual(t.byID["b"]?.url, "/g/east/coles")
    }

    func testKML() {
        let kml = """
        <kml><Document><name>Crag</name><Folder><name>Parking</name><Placemark><name>Car park</name><Point><coordinates>147.5,-42.5,0</coordinates></Point></Placemark></Folder></Document></kml>
        """
        let pts = KMLPoints.parse(Data(kml.utf8), guideID: "g1")
        XCTAssertEqual(pts.count, 1)
        XCTAssertEqual(pts[0].latitude, -42.5, accuracy: 1e-9)
        XCTAssertEqual(pts[0].longitude, 147.5, accuracy: 1e-9)
        XCTAssertEqual(pts[0].guideID, "g1")
    }
}

final class HashingTests: XCTestCase {
    func testSha256() {
        XCTAssertEqual(Hashing.sha256(of: Data("a".utf8)), "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb")
    }
}
