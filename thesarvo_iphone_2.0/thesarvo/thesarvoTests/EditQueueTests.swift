import XCTest
@testable import thesarvo

final class SaveServer: URLProtocol {
    nonisolated(unsafe) static var online = true
    nonisolated(unsafe) static var status = 200
    nonisolated(unsafe) static var received: [(auth: String, body: String)] = []
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard Self.online, let url = request.url else { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return }
        let body = request.httpBody ?? request.httpBodyStream.map { s -> Data in
            s.open(); defer { s.close() }
            var d = Data(); var buf = [UInt8](repeating: 0, count: 4096)
            while s.hasBytesAvailable { let n = s.read(&buf, maxLength: buf.count); if n <= 0 { break }; d.append(buf, count: n) }
            return d
        } ?? Data()
        Self.received.append((request.value(forHTTPHeaderField: "authorization") ?? "", String(decoding: body, as: UTF8.self)))
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: url, statusCode: Self.status, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data("{}".utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class EditQueueTests: XCTestCase {
    var dir: URL!
    var session: URLSession!
    let body = "{\"guide\":\"167\",\"session\":\"s\",\"changes\":{\"nodes\":[]}}"

    override func setUp() {
        dir = FileManager.default.temporaryDirectory.appendingPathComponent("eq-\(UUID().uuidString)")
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [SaveServer.self]
        session = URLSession(configuration: cfg)
        SaveServer.online = true
        SaveServer.status = 200
        SaveServer.received = []
    }

    override func tearDown() { try? FileManager.default.removeItem(at: dir) }

    func testGuideIDFromBody() {
        XCTAssertEqual(EditQueue.guideID(inSaveBody: body), "167")
        XCTAssertNil(EditQueue.guideID(inSaveBody: "{}"))
        XCTAssertNil(EditQueue.guideID(inSaveBody: nil))
    }

    func testQueuedEditSurvivesARestartAndIsSentOnceOnline() async {
        EditQueue(storeRoot: dir).enqueue(guide: "167", email: "a@b.c", body: body)
        let after = EditQueue(storeRoot: dir) // a new launch
        XCTAssertEqual(after.pending().count, 1)
        SaveServer.online = false
        let none = await after.replay(email: "a@b.c", idToken: "T", session: session)
        XCTAssertEqual(none, 0)
        XCTAssertEqual(after.pending().count, 1)
        SaveServer.online = true
        let sent = await after.replay(email: "a@b.c", idToken: "T", session: session)
        XCTAssertEqual(sent, 1)
        XCTAssertEqual(SaveServer.received.map(\.auth), ["Bearer T"])
        XCTAssertTrue(SaveServer.received[0].body.contains("\"guide\":\"167\""))
        XCTAssertTrue(after.pending().isEmpty)
    }

    func testNewestSaveReplacesTheOlderOneForTheSameGuide() {
        let q = EditQueue(storeRoot: dir)
        q.enqueue(guide: "167", email: "a@b.c", body: "{\"guide\":\"167\",\"n\":1}")
        q.enqueue(guide: "167", email: "a@b.c", body: "{\"guide\":\"167\",\"n\":2}")
        XCTAssertEqual(q.pending().map(\.body), ["{\"guide\":\"167\",\"n\":2}"])
    }

    func testOnlySentForThePersonWhoMadeIt() async {
        let q = EditQueue(storeRoot: dir)
        q.enqueue(guide: "167", email: "a@b.c", body: body)
        let sent = await q.replay(email: "someone@else.com", idToken: "T", session: session)
        XCTAssertEqual(sent, 0)
        XCTAssertTrue(SaveServer.received.isEmpty)
        XCTAssertEqual(q.pending().count, 1)
    }

    func testRefusedOrConflictingEditsAreKept() async {
        let q = EditQueue(storeRoot: dir)
        q.enqueue(guide: "167", email: "a@b.c", body: body)
        for status in [409, 400, 502] {
            SaveServer.status = status
            let sent = await q.replay(email: "a@b.c", idToken: "T", session: session)
            XCTAssertEqual(sent, 0)
            XCTAssertEqual(q.pending().count, 1, "status \(status)")
        }
    }

    func testSignOutAndPrivateWipeLeaveTheQueue() {
        let q = EditQueue(storeRoot: dir)
        q.enqueue(guide: "167", email: "a@b.c", body: body)
        PrivateStore(storeRoot: dir).wipe()
        BlobStore(root: dir, seedRoot: nil).wipe()
        XCTAssertEqual(q.pending().count, 1)
    }
}
