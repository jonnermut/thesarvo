import XCTest
@testable import thesarvo

/// Answers the private manifest and photo downloads like the server would, without a network.
final class FakeServer: URLProtocol {
    nonisolated(unsafe) static var manifest = Data()
    nonisolated(unsafe) static var seenAuth: [String] = []
    nonisolated(unsafe) static var online = true
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard Self.online, let url = request.url else { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return }
        var status = 200
        var body = Data("jpegbytes".utf8)
        if url.path == "/g/api/app-private-manifest" {
            Self.seenAuth.append(request.value(forHTTPHeaderField: "authorization") ?? "")
            if request.value(forHTTPHeaderField: "authorization") == nil { status = 401; body = Data("{}".utf8) } else { body = Self.manifest }
        }
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class PrivateStoreTests: XCTestCase {
    var dir: URL!
    var session: URLSession!

    override func setUp() {
        dir = FileManager.default.temporaryDirectory.appendingPathComponent("pstore-\(UUID().uuidString)")
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [FakeServer.self]
        session = URLSession(configuration: cfg)
        FakeServer.online = true
        FakeServer.seenAuth = []
        let manifest: [String: Any] = [
            "schema": 1, "builtAt": "2026-11-01T00:00:00.000Z", "expiresAt": "2026-11-01T06:00:00.000Z",
            "grafts": [["parent": "1", "node": ["id": "5", "title": "Secret", "path": "secret", "isGuide": true, "children": []]]],
            "pages": ["5": ["guide": ["title": "Secret"], "body": NSNull(), "history": []]],
            "images": [["g": "5", "n": "a b.jpg", "u": "https://signed.example/5/a%20b.jpg"], ["g": "5", "n": "c.jpg", "u": "https://signed.example/5/c.jpg"]],
        ]
        FakeServer.manifest = try! JSONSerialization.data(withJSONObject: manifest)
    }

    override func tearDown() { try? FileManager.default.removeItem(at: dir) }

    func testFillStoresManifestAndPhotosThenAnswersOffline() async throws {
        let store = PrivateStore(storeRoot: dir)
        let fetched = try await PrivateSync.fill(store: store, idToken: "TOKEN", session: session)
        XCTAssertEqual(fetched, 2)
        XCTAssertEqual(FakeServer.seenAuth, ["Bearer TOKEN"])
        XCTAssertTrue(store.isFilled)

        FakeServer.online = false
        let tree = try XCTUnwrap(store.offlineAnswer(path: "/g/api/private-tree"))
        XCTAssertEqual(tree.status, 200)
        XCTAssertTrue(tree.body.contains("Secret"))
        let page = try XCTUnwrap(store.offlineAnswer(path: "/g/api/private?id=5"))
        let images = try XCTUnwrap((try JSONSerialization.jsonObject(with: Data(page.body.utf8)) as? [String: Any])?["images"] as? [String: String])
        XCTAssertEqual(images["a b.jpg"], "thesarvo://site/private-images/5/a%20b.jpg")
        XCTAssertNil(store.offlineAnswer(path: "/g/api/private?id=6"))
        XCTAssertNil(store.offlineAnswer(path: "/g/api/me"))
        let file = try XCTUnwrap(store.imageFile(forPath: "/private-images/5/a%20b.jpg"))
        XCTAssertEqual(try String(contentsOf: file), "jpegbytes")
        XCTAssertNil(store.imageFile(forPath: "/private-images/5/../x"))
    }

    func testSecondFillOnlyFetchesMissingPhotos() async throws {
        let store = PrivateStore(storeRoot: dir)
        _ = try await PrivateSync.fill(store: store, idToken: "T", session: session)
        let again = try await PrivateSync.fill(store: store, idToken: "T", session: session)
        XCTAssertEqual(again, 0)
    }

    func testSignedOutAndOfflineFailCleanly() async {
        let store = PrivateStore(storeRoot: dir)
        do { _ = try await PrivateSync.fill(store: store, idToken: nil, session: session); XCTFail() } catch { XCTAssertEqual(error as? PrivateSync.Failure, .signedOut) }
        FakeServer.online = false
        do { _ = try await PrivateSync.fill(store: store, idToken: "T", session: session); XCTFail() } catch { XCTAssertEqual(error as? PrivateSync.Failure, .offline) }
        XCTAssertFalse(store.isFilled)
    }

    func testSignOutWipeRemovesOnlyThePrivateDirectory() async throws {
        let blobs = BlobStore(root: dir, seedRoot: nil)
        let hash = Hashing.sha256(of: Data("x".utf8))
        let tmp = dir.appendingPathComponent("t")
        try Data("x".utf8).write(to: tmp)
        try blobs.put(tmp, as: hash)
        let store = PrivateStore(storeRoot: dir)
        _ = try await PrivateSync.fill(store: store, idToken: "T", session: session)
        XCTAssertGreaterThan(store.storedBytes(), 0)
        store.wipe()
        XCTAssertFalse(store.isFilled)
        XCTAssertEqual(store.storedBytes(), 0)
        XCTAssertNotNil(blobs.url(for: hash))
    }

    func testRejectsAManifestThatIsNotOurs() {
        XCTAssertThrowsError(try PrivateStore(storeRoot: dir).save(manifest: Data("{\"schema\":2}".utf8)))
    }
}
