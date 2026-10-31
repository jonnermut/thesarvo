import Foundation

/// What the signed-in person's private guides need offline, kept in `<store>/private/`: apart from the public blob store, never in the
/// bundle, and removed whole on sign-out. Filled from `GET /g/api/app-private-manifest` (pages, tree grafts, signed photo links).
final class PrivateStore: @unchecked Sendable {
    let root: URL
    static let imagePrefix = "/private-images/"

    init(storeRoot: URL) {
        root = storeRoot.appendingPathComponent("private", isDirectory: true)
    }

    private var manifestURL: URL { root.appendingPathComponent("manifest.json") }

    struct Photo: Equatable { var guide: String; var name: String; var url: String }

    private func object() -> [String: Any]? {
        (try? Data(contentsOf: manifestURL)).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }

    var isFilled: Bool { object() != nil }

    func save(manifest data: Data) throws {
        guard let o = try JSONSerialization.jsonObject(with: data) as? [String: Any], o["schema"] as? Int == 1, o["pages"] is [String: Any] else { throw StoreError.hashMismatch }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try data.write(to: manifestURL, options: .atomic)
    }

    func photos() -> [Photo] {
        (object()?["images"] as? [[String: String]] ?? []).compactMap { d in
            guard let g = d["g"], let n = d["n"], let u = d["u"] else { return nil }
            return Photo(guide: g, name: n, url: u)
        }
    }

    func expiresAt() -> Date? {
        (object()?["expiresAt"] as? String).flatMap { ISO8601DateFormatter.withFraction.date(from: $0) ?? ISO8601DateFormatter().date(from: $0) }
    }

    // MARK: photos

    func imageURL(guide: String, name: String) -> URL {
        root.appendingPathComponent("images", isDirectory: true).appendingPathComponent(guide, isDirectory: true).appendingPathComponent(Hashing.sha256(of: Data(name.utf8)))
    }

    func hasImage(_ p: Photo) -> Bool { FileManager.default.fileExists(atPath: imageURL(guide: p.guide, name: p.name).path) }

    func putImage(_ temp: URL, for p: Photo) throws {
        let dest = imageURL(guide: p.guide, name: p.name)
        try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? FileManager.default.removeItem(at: dest)
        try FileManager.default.moveItem(at: temp, to: dest)
    }

    /// The file for `/private-images/<guide>/<name>`, if downloaded.
    func imageFile(forPath path: String) -> URL? {
        guard path.hasPrefix(Self.imagePrefix) else { return nil }
        let parts = path.dropFirst(Self.imagePrefix.count).split(separator: "/", maxSplits: 1).map(String.init)
        guard parts.count == 2, let name = parts[1].removingPercentEncoding else { return nil }
        let u = imageURL(guide: parts[0], name: name)
        return FileManager.default.fileExists(atPath: u.path) ? u : nil
    }

    // MARK: offline answers

    /// What the server would answer for a private page or the private tree, from the stored manifest; nil when it is not a private call or not stored.
    /// Photo links in a page point at the local copies, which the scheme handler serves.
    func offlineAnswer(path: String) -> (status: Int, body: String)? {
        guard let o = object(), let url = URL(string: path, relativeTo: URL(string: "http://x")) else { return nil }
        func json(_ v: Any) -> (Int, String)? { (try? JSONSerialization.data(withJSONObject: v)).flatMap { String(data: $0, encoding: .utf8) }.map { (200, $0) } }
        switch url.path {
        case "/g/api/private-tree":
            return json(o["grafts"] ?? [])
        case "/g/api/private":
            let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "id" }?.value ?? ""
            guard var page = (o["pages"] as? [String: Any])?[id] as? [String: Any] else { return nil }
            var images: [String: String] = [:]
            for p in photos() where p.guide == id && hasImage(p) {
                images[p.name] = "\(AppConfig.originURL.absoluteString)\(Self.imagePrefix)\(id)/\(p.name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? p.name)"
            }
            page["images"] = images
            return json(page)
        default:
            return nil
        }
    }

    func storedBytes() -> Int64 {
        var total: Int64 = 0
        if let e = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let u as URL in e { total += Int64((try? u.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
        }
        return total
    }

    func wipe() { try? FileManager.default.removeItem(at: root) }
}

extension ISO8601DateFormatter {
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}

enum PrivateSync {
    enum Failure: Error, Equatable { case offline, signedOut, server(Int) }

    /// Fetches the private manifest with the person's token, stores it, and downloads the photos not yet stored. Returns the number of photos fetched.
    @discardableResult
    static func fill(store: PrivateStore, idToken: String?, session: URLSession = .shared, concurrency: Int = 4) async throws -> Int {
        guard let idToken else { throw Failure.signedOut }
        let r = BridgeRequest(["id": 0, "path": "/g/api/app-private-manifest"])!
        let answer = await BridgeAPI.perform(r, idToken: idToken, session: session)
        if answer.status == 0 { throw Failure.offline }
        guard answer.status == 200 else { throw Failure.server(answer.status) }
        try store.save(manifest: Data(answer.body.utf8))
        let todo = store.photos().filter { !store.hasImage($0) }
        var fetched = 0
        var next = 0
        try await withThrowingTaskGroup(of: Bool.self) { group in
            func start() {
                guard next < todo.count else { return }
                let p = todo[next]
                next += 1
                group.addTask {
                    guard let u = URL(string: p.url) else { return false }
                    guard let (temp, resp) = try? await session.download(from: u), (resp as? HTTPURLResponse)?.statusCode == 200 else { return false }
                    return (try? store.putImage(temp, for: p)) != nil
                }
            }
            for _ in 0..<concurrency { start() }
            while let ok = try await group.next() {
                if ok { fetched += 1 }
                start()
            }
        }
        return fetched
    }
}
