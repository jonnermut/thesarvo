import XCTest
@testable import thesarvo

@MainActor
final class MenuTests: XCTestCase {
    private func model() throws -> AppModel {
        let json = #"{"nodes":[{"id":"r","parent":null,"title":"Root","path":"","isGuide":false},{"id":"a","parent":"r","title":"East","path":"east","isGuide":false},{"id":"b","parent":"a","title":"Coles","path":"east/coles","isGuide":true},{"id":"c","parent":"r","title":"Intro","path":"intro","isGuide":true}]}"#
        let t = try XCTUnwrap(TreeLoader.parse(Data(json.utf8)))
        let app = AppModel()
        app.byID = t.byID
        return app
    }

    func testMenuOpensWhereYouAre() throws {
        let app = try model()
        XCTAssertEqual(app.folder(for: "b"), "a", "a page opens its parent's level")
        XCTAssertEqual(app.folder(for: "a"), "a", "a folder opens its own children")
        XCTAssertNil(app.folder(for: "c"), "a top-level page opens the top")
        XCTAssertNil(app.folder(for: nil))
    }

    func testRecentsKeepGuidesOnlyNewestFirst() throws {
        let app = try model()
        app.recents = []
        for path in ["/g/east/coles", "/g/east", "/g/intro", "/g/east/coles"] { app.selectionFollows(path: path) }
        XCTAssertEqual(app.recents, ["b", "c"])
        UserDefaults.standard.removeObject(forKey: "recentGuides")
    }
}

final class ShareTests: XCTestCase {
    func testDirectionsOfferAppleGoogleAndWaze() {
        let t = DirectionsTarget.all(latitude: -42.8821, longitude: 147.3272, title: "Car park & track")
        XCTAssertEqual(t.map(\.name), ["Apple Maps", "Google Maps", "Waze"])
        XCTAssertTrue(t[1].url.absoluteString.contains("destination=-42.882100,147.327200"))
        XCTAssertTrue(t[0].url.absoluteString.contains("q=Car%20park%20%26%20track"))
    }

    func testSharedFileNameStaysInsideTheTemporaryFolder() throws {
        let f = try XCTUnwrap(SharedFile.make(name: "../../Eldon: south.gpx", text: "<gpx/>"))
        XCTAssertFalse(f.url.lastPathComponent.contains("/"))
        XCTAssertTrue(f.url.path.hasPrefix(FileManager.default.temporaryDirectory.path))
        XCTAssertEqual(try String(contentsOf: f.url), "<gpx/>")
    }
}
