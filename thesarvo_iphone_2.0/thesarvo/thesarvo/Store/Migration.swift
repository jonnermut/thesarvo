import Foundation

/// Carries the old app's (2.x) settings over, once, and removes the files it downloaded.
enum Migration {
    private static let doneKey = "migratedTo3"

    @MainActor
    static func run(model: AppModel) {
        let d = UserDefaults.standard
        guard !d.bool(forKey: doneKey) else { return }
        d.set(true, forKey: doneKey)

        let hadOld = d.object(forKey: "lastViewId") != nil || d.object(forKey: "fontSizeIndex") != nil || d.object(forKey: "showClimbsInTOC") != nil
        if let idx = d.object(forKey: "fontSizeIndex") as? Int, d.object(forKey: "textScale") == nil {
            let scales = [0.85, 1.0, 1.15, 1.3, 1.5]
            model.textScale = scales[min(max(idx, 0), scales.count - 1)]
        }
        if let last = d.string(forKey: "lastViewId"), d.string(forKey: "lastPath") == nil, !last.isEmpty {
            d.set("/g/", forKey: "lastPath")
            pendingGuideID = last
        }
        removeOldFiles()
        if hadOld { model.notice = "Welcome to the new thesarvo" }
    }

    /// The old app's guide id, opened once the menu tree has loaded.
    nonisolated(unsafe) static var pendingGuideID: String?

    private static func removeOldFiles() {
        let fm = FileManager.default
        guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first,
              let items = try? fm.contentsOfDirectory(at: docs, includingPropertiesForKeys: nil) else { return }
        for u in items where ["xml", "html", "kml", "zip", "jpg", "png"].contains(u.pathExtension.lowercased()) || u.lastPathComponent == "www" {
            try? fm.removeItem(at: u)
        }
    }
}
