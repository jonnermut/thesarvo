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

    func testMapTabFocusesThePageButOpenMapKeepsItsOwnFocus() throws {
        let app = try model()
        app.selection = "b"
        app.tab = .map
        XCTAssertEqual(app.mapFocus, "b", "the tab bar shows the page's guide")
        app.tab = .guides
        app.openMap(guide: "c")
        XCTAssertEqual(app.mapFocus, "c", "Open in Map keeps the guide it asked for")
    }

    func testClusterNamesTheSharedArea() throws {
        let app = try model()
        XCTAssertEqual(app.areaNames(for: "b"), ["East", "Coles"])
        XCTAssertEqual(ClusterName.label(for: [["East", "Coles"], ["East", "Eldon"]]), "Coles +1", "a few guides: the first by name, and how many more")
        XCTAssertEqual(ClusterName.label(for: [["East", "Coles"], ["East", "Coles"]]), "Coles")
        XCTAssertEqual(ClusterName.label(for: [["East", "Coles"], ["East", "Coles"], ["East", "Eldon"]]), "Coles +1", "the biggest guide leads")
        XCTAssertNil(ClusterName.label(for: [[]]))
        XCTAssertEqual(ClusterName.label(for: [["Bouldering", "Hobart", "Taroona"], ["Bouldering", "Hobart", "Risdon"]]), "Risdon +1")
        let many = ["A", "B", "C", "D", "E"].map { ["East", $0] }
        XCTAssertEqual(ClusterName.label(for: many), "East", "many guides: the area they share")
        XCTAssertEqual(ClusterName.label(for: many.map { ["Bouldering", "Hobart"] + $0.dropFirst() }), "Hobart bouldering")
        XCTAssertEqual(ClusterName.label(for: many + [["West", "Z"]]), "East")
    }

    func testPointOpensThePageNamedByItsFolder() throws {
        let app = try model()
        app.openGuide(id: "a", place: "coles")
        XCTAssertEqual(app.selection, "b", "the folder 'Coles' is the page below East")
        app.openGuide(id: "a", place: "Nowhere")
        XCTAssertEqual(app.selection, "a", "no such page: the guide itself")
    }

    func testDownloadsBadgeShowsPercentWhileWorking() throws {
        let app = try model()
        XCTAssertNil(app.downloading)
        app.progress = SyncProgress(phase: "Photos", doneBytes: 25, totalBytes: 100)
        XCTAssertEqual(app.downloading, "25%")
        app.progress = SyncProgress(phase: "Up to date")
        XCTAssertNil(app.downloading)
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
