import CryptoKit
import Foundation

enum Hashing {
    /// SHA-256 of a file, streamed so large photos never sit in memory.
    static func sha256(of url: URL) throws -> String {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var hasher = SHA256()
        while let chunk = try handle.read(upToCount: 1 << 20), !chunk.isEmpty { hasher.update(data: chunk) }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }

    static func sha256(of data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

/// Every file downloaded, named by its SHA-256 (one copy however many paths use it), in two layers: the store in Application
/// Support, and the read-only seed inside the app bundle (`Seed/blobs/<hash>`, `Seed/seed-manifest.json`).
final class BlobStore: @unchecked Sendable {
    let root: URL
    let seedRoot: URL?
    private let blobs: URL
    private let lock = NSLock()
    private var seedHashes: Set<String>?

    init(root: URL? = nil, seedRoot: URL? = Bundle.main.resourceURL?.appendingPathComponent("Seed")) {
        let base = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("thesarvo", isDirectory: true)
        self.root = base
        self.blobs = base.appendingPathComponent("blobs", isDirectory: true)
        self.seedRoot = seedRoot
        try? FileManager.default.createDirectory(at: blobs, withIntermediateDirectories: true)
        var excluded = URLResourceValues()
        excluded.isExcludedFromBackup = true
        var mutable = base
        try? mutable.setResourceValues(excluded)
    }

    private func storeURL(_ hash: String) -> URL {
        blobs.appendingPathComponent(String(hash.prefix(2)), isDirectory: true).appendingPathComponent(hash)
    }

    private func seedURL(_ hash: String) -> URL? {
        seedRoot?.appendingPathComponent("blobs").appendingPathComponent(hash)
    }

    /// Where a blob can be read from (store first, then the seed), or nil.
    func url(for hash: String) -> URL? {
        let s = storeURL(hash)
        if FileManager.default.fileExists(atPath: s.path) { return s }
        if let seed = seedURL(hash), FileManager.default.fileExists(atPath: seed.path) { return seed }
        return nil
    }

    func storedHashes() -> Set<String> {
        var out = Set<String>()
        let fm = FileManager.default
        guard let dirs = try? fm.contentsOfDirectory(atPath: blobs.path) else { return out }
        for d in dirs {
            for f in (try? fm.contentsOfDirectory(atPath: blobs.appendingPathComponent(d).path)) ?? [] { out.insert(f) }
        }
        return out
    }

    func seededHashes() -> Set<String> {
        lock.lock()
        defer { lock.unlock() }
        if let s = seedHashes { return s }
        var out = Set<String>()
        if let dir = seedRoot?.appendingPathComponent("blobs"), let names = try? FileManager.default.contentsOfDirectory(atPath: dir.path) { out = Set(names) }
        seedHashes = out
        return out
    }

    func presentHashes() -> Set<String> { storedHashes().union(seededHashes()) }

    /// Moves a finished download into the store if (and only if) its bytes hash to `hash`.
    func put(_ temp: URL, as hash: String) throws {
        guard try Hashing.sha256(of: temp) == hash else { throw StoreError.hashMismatch }
        let dest = storeURL(hash)
        let fm = FileManager.default
        try fm.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
        if fm.fileExists(atPath: dest.path) { try? fm.removeItem(at: temp); return }
        try fm.moveItem(at: temp, to: dest)
    }

    func remove(_ hashes: some Sequence<String>) {
        for h in hashes { try? FileManager.default.removeItem(at: storeURL(h)) }
    }

    func storedBytes() -> Int64 {
        var total: Int64 = 0
        let keys: [URLResourceKey] = [.fileSizeKey]
        if let e = FileManager.default.enumerator(at: blobs, includingPropertiesForKeys: keys) {
            for case let u as URL in e { total += Int64((try? u.resourceValues(forKeys: Set(keys)).fileSize) ?? 0) }
        }
        return total
    }

    func wipe() {
        try? FileManager.default.removeItem(at: blobs)
        try? FileManager.default.createDirectory(at: blobs, withIntermediateDirectories: true)
    }

    // MARK: kept manifests (the "generations")

    private func manifestURL(_ name: String) -> URL { root.appendingPathComponent("\(name).json") }

    func loadManifest(_ name: String) -> AppManifest? {
        guard let d = try? Data(contentsOf: manifestURL(name)) else { return nil }
        return try? JSONDecoder().decode(AppManifest.self, from: d)
    }

    func saveManifest(_ data: Data, name: String) throws {
        try data.write(to: manifestURL(name), options: .atomic)
    }

    /// The downloaded candidate becomes current; the old current is kept as the rollback.
    func promoteCandidate() {
        let fm = FileManager.default
        guard fm.fileExists(atPath: manifestURL("candidate").path) else { return }
        if fm.fileExists(atPath: manifestURL("current").path) {
            try? fm.removeItem(at: manifestURL("previous"))
            try? fm.moveItem(at: manifestURL("current"), to: manifestURL("previous"))
        }
        try? fm.moveItem(at: manifestURL("candidate"), to: manifestURL("current"))
    }

    func removeManifest(_ name: String) { try? FileManager.default.removeItem(at: manifestURL(name)) }

    func loadSeedManifest() -> AppManifest? {
        guard let u = seedRoot?.appendingPathComponent("seed-manifest.json"), let d = try? Data(contentsOf: u) else { return nil }
        return try? JSONDecoder().decode(AppManifest.self, from: d)
    }

    // MARK: small state file

    struct State: Codable {
        var etag: String?
        var lastCheck: Date?
        var bootPending: Bool = false
        /// A background refresh made a new generation current that no page has loaded yet: the next launch guards its first paint.
        var freshSwitch: Bool?
    }

    func loadState() -> State {
        (try? Data(contentsOf: root.appendingPathComponent("state.json"))).flatMap { try? JSONDecoder().decode(State.self, from: $0) } ?? State()
    }

    func saveState(_ s: State) {
        if let d = try? JSONEncoder().encode(s) { try? d.write(to: root.appendingPathComponent("state.json"), options: .atomic) }
    }
}

enum StoreError: Error {
    case hashMismatch
}
