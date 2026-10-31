import Foundation

/// The app pack manifest (`app/v1/manifest.json`), written by thesarvo-3's `build-app-pack`. Mirrors `src/app/manifest.ts`.
struct AppFile: Codable, Hashable, Sendable {
    let p: String
    let h: String
    let z: Int
    let c: String
}

/// A variant's `[hash, size]`.
struct VariantRef: Codable, Hashable, Sendable {
    let hash: String
    let size: Int

    init(hash: String, size: Int) {
        self.hash = hash
        self.size = size
    }

    init(from decoder: Decoder) throws {
        var c = try decoder.unkeyedContainer()
        hash = try c.decode(String.self)
        size = try c.decode(Int.self)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.unkeyedContainer()
        try c.encode(hash)
        try c.encode(size)
    }
}

enum Variant: String, CaseIterable, Sendable {
    case s, m, l
}

struct AppImage: Codable, Hashable, Sendable {
    let g: String
    let n: String
    let x: String
    let s: VariantRef?
    let m: VariantRef?
    let l: VariantRef?

    func variant(_ v: Variant) -> VariantRef? {
        switch v {
        case .s: return s
        case .m: return m
        case .l: return l
        }
    }
}

struct AppManifest: Codable, Sendable {
    let schema: Int
    let contentCommit: String
    let builtAt: String
    let minShell: Int
    let bridge: Int
    let files: [AppFile]
    let images: [AppImage]
}

/// Which guides get a variant: all, none, or a list of guide ids.
enum Selection: Codable, Equatable, Sendable {
    case all
    case none
    case guides(Set<String>)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let b = try? c.decode(Bool.self) {
            self = b ? .all : .none
        } else {
            self = .guides(Set(try c.decode([String].self)))
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .all: try c.encode(true)
        case .none: try c.encode(false)
        case .guides(let ids): try c.encode(ids.sorted())
        }
    }

    func wants(_ guide: String) -> Bool {
        switch self {
        case .all: return true
        case .none: return false
        case .guides(let ids): return ids.contains(guide)
        }
    }
}

struct Policy: Codable, Equatable, Sendable {
    var s: Selection
    var m: Selection
    var l: Selection

    static let thumbnails = Policy(s: .all, m: .none, l: .none)

    func selection(_ v: Variant) -> Selection {
        switch v {
        case .s: return s
        case .m: return m
        case .l: return l
        }
    }
}

struct Download: Equatable, Sendable {
    /// The file's category (`shell`, `data`, `html`) or the image variant (`s`, `m`, `l`).
    let kind: String
    let path: String
    let hash: String
    let size: Int
}

struct GenerationImage: Sendable {
    let x: String
    var s: String?
    var m: String?
    var l: String?

    func hash(_ v: Variant) -> String? {
        switch v {
        case .s: return s
        case .m: return m
        case .l: return l
        }
    }
}

/// The path index the scheme handler serves from: URL path to blob hash, and `<guide>/<name>` to image variant hashes.
struct GenerationIndex: Sendable {
    var paths: [String: String] = [:]
    var images: [String: GenerationImage] = [:]
}

/// The pure sync core (no I/O): the same answers as `src/app/syncPlan.ts`, checked against the shared vectors.
enum SyncPlan {
    private static let order = ["shell", "data", "html", "s", "m", "l"]

    static func wanted(_ manifest: AppManifest, _ policy: Policy) -> [Download] {
        var out = manifest.files.map { Download(kind: $0.c, path: $0.p, hash: $0.h, size: $0.z) }
        for im in manifest.images {
            for v in Variant.allCases {
                if let e = im.variant(v), policy.selection(v).wants(im.g) {
                    out.append(Download(kind: v.rawValue, path: "images-app/\(e.hash)", hash: e.hash, size: e.size))
                }
            }
        }
        return out
    }

    static func diff(_ manifest: AppManifest, present: Set<String>, policy: Policy) -> (downloads: [Download], deletions: [String]) {
        var seen = Set<String>()
        var downloads: [Download] = []
        for d in wanted(manifest, policy) where !present.contains(d.hash) && seen.insert(d.hash).inserted {
            downloads.append(d)
        }
        // A stable sort keeps the manifest's order inside a kind.
        let ranked = downloads.enumerated().sorted {
            let a = order.firstIndex(of: $0.element.kind) ?? 99
            let b = order.firstIndex(of: $1.element.kind) ?? 99
            return a != b ? a < b : $0.offset < $1.offset
        }.map(\.element)
        let listed = Set(wanted(manifest, Policy(s: .all, m: .all, l: .all)).map(\.hash))
        return (ranked, present.subtracting(listed).sorted())
    }

    static func generation(_ manifest: AppManifest, present: Set<String>) -> GenerationIndex {
        var index = GenerationIndex()
        for f in manifest.files where present.contains(f.h) { index.paths["/" + f.p] = f.h }
        for im in manifest.images {
            var e = GenerationImage(x: im.x)
            for v in Variant.allCases {
                guard let h = im.variant(v)?.hash, present.contains(h) else { continue }
                switch v {
                case .s: e.s = h
                case .m: e.m = h
                case .l: e.l = h
                }
            }
            if e.s != nil || e.m != nil || e.l != nil { index.images["\(im.g)/\(im.n)"] = e }
        }
        return index
    }

    static func textComplete(_ manifest: AppManifest, present: Set<String>) -> Bool {
        manifest.files.allSatisfy { present.contains($0.h) }
    }
}
