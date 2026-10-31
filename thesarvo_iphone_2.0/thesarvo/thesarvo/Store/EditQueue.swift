import Foundation

/// Saves the page could not send (no network), kept as files so the OS cannot evict them like web storage. One entry per guide: every
/// save request carries all the changes since the guide was last saved, so the newest one holds the older ones. An entry is dropped only
/// when the server took it (or a later save of that guide went through); sign-out and reset never touch it, and it is only sent for the
/// person who made it.
final class EditQueue: @unchecked Sendable {
    struct Entry: Codable, Equatable {
        var guide: String
        var email: String
        var body: String
        var queuedAt: Date
    }

    static let savePath = "/g/api/save"
    private let dir: URL

    init(storeRoot: URL) {
        dir = storeRoot.appendingPathComponent("edit-queue", isDirectory: true)
    }

    private func file(_ guide: String) -> URL { dir.appendingPathComponent("\(guide.filter { $0.isNumber || $0.isLetter }).json") }

    /// The guide id in a save request body, or nil when it is not a save we can queue.
    static func guideID(inSaveBody body: String?) -> String? {
        guard let body, let o = (try? JSONSerialization.jsonObject(with: Data(body.utf8))) as? [String: Any], let g = o["guide"] as? String, !g.isEmpty else { return nil }
        return g
    }

    func enqueue(guide: String, email: String, body: String, now: Date = Date()) {
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let e = Entry(guide: guide, email: email, body: body, queuedAt: now)
        if let d = try? JSONEncoder().encode(e) { try? d.write(to: file(guide), options: [.atomic]) }
    }

    func remove(guide: String) { try? FileManager.default.removeItem(at: file(guide)) }

    func pending() -> [Entry] {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.compactMap { n in (try? Data(contentsOf: dir.appendingPathComponent(n))).flatMap { try? JSONDecoder().decode(Entry.self, from: $0) } }
            .sorted { $0.queuedAt < $1.queuedAt }
    }

    /// Sends what is waiting for `email`. Returns how many the server took.
    @discardableResult
    func replay(email: String, idToken: String, session: URLSession = .shared) async -> Int {
        var sent = 0
        for e in pending() where e.email == email {
            let r = BridgeRequest(["id": 0, "method": "POST", "path": Self.savePath, "headers": ["content-type": "application/json"], "body": e.body])!
            let answer = await BridgeAPI.perform(r, idToken: idToken, session: session)
            if answer.status == 0 { break } // still offline: try later, keep the order
            if answer.status == 200 { remove(guide: e.guide); sent += 1 }
        }
        return sent
    }
}
