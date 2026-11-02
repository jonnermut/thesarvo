import Foundation

/// Where to send a map point: the apps a climber is likely to use for directions. The https links open the app when it is installed
/// (universal links) and its web page otherwise, so no `LSApplicationQueriesSchemes` entry is needed.
struct DirectionsTarget: Equatable {
    let name: String
    let url: URL

    static func all(latitude: Double, longitude: Double, title: String) -> [DirectionsTarget] {
        let ll = String(format: "%.6f,%.6f", latitude, longitude)
        let q = title.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
        return [
            ("Apple Maps", "https://maps.apple.com/?daddr=\(ll)&q=\(q)&dirflg=d"),
            ("Google Maps", "https://www.google.com/maps/dir/?api=1&destination=\(ll)&travelmode=driving"),
            ("Waze", "https://waze.com/ul?ll=\(ll)&navigate=yes"),
        ].compactMap { n, s in URL(string: s).map { DirectionsTarget(name: n, url: $0) } }
    }
}

/// A file made by the page (a guide's GPX or KML), written to a temporary place for the share sheet.
struct SharedFile: Identifiable {
    let id = UUID()
    let url: URL

    /// Nil when there is nothing to write. The name is cleaned so it stays inside the temporary folder.
    static func make(name: String, text: String) -> SharedFile? {
        let bad = CharacterSet(charactersIn: "/\\:?*\"<>|").union(.controlCharacters)
        var clean = name.components(separatedBy: bad).joined(separator: "-").trimmingCharacters(in: CharacterSet(charactersIn: ". "))
        if clean.isEmpty { clean = "guide.gpx" }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("shared-\(UUID().uuidString)", isDirectory: true)
        let url = dir.appendingPathComponent(clean)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try Data(text.utf8).write(to: url)
        } catch { return nil }
        return SharedFile(url: url)
    }
}
