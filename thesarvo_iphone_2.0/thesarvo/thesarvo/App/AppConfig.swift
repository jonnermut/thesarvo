import Foundation

enum AppConfig {
    static let originScheme = "thesarvo"
    static let originURL = URL(string: "thesarvo://site")!
    static let bridgeVersion = 1
    static let shellVersion = 1

    /// Where the manifest and files come from. Debug builds default to the local test server (`serve-app-local.mjs`).
    static var baseURL: URL {
        if let s = UserDefaults.standard.string(forKey: "syncBase"), let u = URL(string: s), u.scheme != nil { return u }
        return defaultBase
    }

    #if DEBUG
    static let defaultBase = URL(string: "http://localhost:47300")!
    #else
    static let defaultBase = URL(string: "https://thesarvo.com")!
    #endif

    static var manifestURL: URL { baseURL.appendingPathComponent("app/v1/manifest.json") }
}
