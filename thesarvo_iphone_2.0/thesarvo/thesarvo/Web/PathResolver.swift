import Foundation

/// Where a request for `thesarvo://site<path>` is answered from. Pure, so it is unit tested.
enum Resolved: Equatable {
    case blob(hash: String, mime: String)
    case proxy
    case notFound
}

enum PathResolver {
    static let mimeTypes: [String: String] = [
        "html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "mjs": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
        "json": "application/json; charset=utf-8", "svg": "image/svg+xml", "kml": "application/vnd.google-earth.kml+xml", "gpx": "application/gpx+xml",
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp", "ico": "image/x-icon",
        "txt": "text/plain; charset=utf-8", "xml": "application/xml", "woff2": "font/woff2", "woff": "font/woff", "pdf": "application/pdf",
    ]

    static func mime(forPath path: String) -> String {
        mimeTypes[(path as NSString).pathExtension.lowercased()] ?? "application/octet-stream"
    }

    /// The variants to try, best first, for the one asked for.
    static func variantOrder(_ wanted: Variant) -> [Variant] {
        switch wanted {
        case .s: return [.s, .m, .l]
        case .m: return [.m, .l, .s]
        case .l: return [.l, .m, .s]
        }
    }

    static func resolve(path rawPath: String, query: String?, index: GenerationIndex) -> Resolved {
        var path = rawPath.removingPercentEncoding ?? rawPath
        if path.isEmpty { path = "/" }
        if let hash = index.paths[path] { return .blob(hash: hash, mime: mime(forPath: path)) }
        let trimmed = path.count > 1 && path.hasSuffix("/") ? String(path.dropLast()) : path
        let dir = trimmed == "/" ? "/index.html" : trimmed + "/index.html"
        if let hash = index.paths[dir] { return .blob(hash: hash, mime: "text/html; charset=utf-8") }

        if path.hasPrefix("/images/") {
            let key = String(path.dropFirst("/images/".count))
            let asked = Variant(rawValue: queryValue(query, "v") ?? "m") ?? .m
            if let e = index.images[key] {
                for v in variantOrder(asked) {
                    if let h = e.hash(v) { return .blob(hash: h, mime: e.x == "png" ? "image/png" : "image/jpeg") }
                }
            }
            return .proxy
        }
        if path.hasPrefix("/g/api/") || path.hasPrefix("/g-data/") || path.hasPrefix("/private/") { return .proxy }
        // A page that was not prerendered (or a route only the client knows): the app shell hydrates it.
        if path.hasPrefix("/g/") && (path as NSString).pathExtension.isEmpty, let hash = index.paths["/g/index.html"] {
            return .blob(hash: hash, mime: "text/html; charset=utf-8")
        }
        return .notFound
    }

    static func queryValue(_ query: String?, _ name: String) -> String? {
        guard let query else { return nil }
        for pair in query.split(separator: "&") {
            let kv = pair.split(separator: "=", maxSplits: 1)
            if kv.count == 2, kv[0] == name { return String(kv[1]) }
        }
        return nil
    }
}
