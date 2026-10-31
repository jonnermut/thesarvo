import Foundation

/// The bridge's `api` message: the page's call to our own API, made here with the signed-in person's ID token.
struct BridgeRequest {
    var id: Int
    var method: String
    var path: String
    var headers: [String: String]
    var body: String?

    init?(_ m: [String: Any]) {
        guard let id = m["id"] as? Int, let path = m["path"] as? String, path.hasPrefix("/g/api/") else { return nil }
        self.id = id
        self.path = path
        method = (m["method"] as? String ?? "GET").uppercased()
        headers = m["headers"] as? [String: String] ?? [:]
        body = m["body"] as? String
    }
}

enum BridgeAPI {
    static var apiBase: URL {
        if let s = UserDefaults.standard.string(forKey: "apiBase"), let u = URL(string: s), u.scheme != nil { return u }
        return URL(string: "https://thesarvo.com")!
    }

    /// Status 0 means no network (the page treats it as offline).
    static func perform(_ r: BridgeRequest, idToken: String?, session: URLSession = .shared) async -> (status: Int, body: String) {
        guard let url = URL(string: r.path, relativeTo: apiBase) else { return (400, "{\"error\":\"Bad path\"}") }
        var req = URLRequest(url: url, timeoutInterval: 30)
        req.httpMethod = r.method
        for (k, v) in r.headers where k.lowercased() != "authorization" && k.lowercased() != "host" { req.setValue(v, forHTTPHeaderField: k) }
        if let idToken { req.setValue("Bearer \(idToken)", forHTTPHeaderField: "authorization") }
        req.httpBody = r.body?.data(using: .utf8)
        do {
            let (data, resp) = try await session.data(for: req)
            return ((resp as? HTTPURLResponse)?.statusCode ?? 0, String(data: data, encoding: .utf8) ?? "")
        } catch {
            return (0, "")
        }
    }

    /// The JavaScript that delivers an answer to `window.thesarvoBridge.reply`.
    static func replyScript(id: Int, status: Int, body: String) -> String {
        let json = (try? JSONSerialization.data(withJSONObject: [body], options: [])).flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return "window.thesarvoBridge && window.thesarvoBridge.reply(\(id), \(status), \(json)[0]);"
    }
}
