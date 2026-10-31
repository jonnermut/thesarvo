import Foundation

struct TreeNode: Identifiable, Hashable {
    let id: String
    let parent: String?
    let title: String
    let path: String
    let isGuide: Bool
    let climbs: Int
    var children: [TreeNode]?

    /// The page URL path for this node.
    var url: String { path.isEmpty ? "/g/" : "/g/\(path)" }
}

private struct RawManifest: Decodable {
    struct Node: Decodable {
        struct Stats: Decodable { let total: Int? }
        let id: String
        let parent: String?
        let title: String
        let path: String
        let isGuide: Bool
        let stats: Stats?
    }
    let nodes: [Node]
}

enum TreeLoader {
    /// Builds the guide tree from `g-data/manifest.json`; returns the root's children and a lookup by id.
    static func parse(_ data: Data) -> (roots: [TreeNode], byID: [String: TreeNode])? {
        guard let raw = try? JSONDecoder().decode(RawManifest.self, from: data) else { return nil }
        var kids: [String: [String]] = [:]
        var flat: [String: RawManifest.Node] = [:]
        var rootID: String?
        for n in raw.nodes {
            flat[n.id] = n
            if let p = n.parent { kids[p, default: []].append(n.id) } else { rootID = n.id }
        }
        var byID: [String: TreeNode] = [:]
        func build(_ id: String) -> TreeNode {
            let n = flat[id]!
            let c = (kids[id] ?? []).map(build)
            let node = TreeNode(id: n.id, parent: n.parent, title: n.title, path: n.path, isGuide: n.isGuide, climbs: n.stats?.total ?? 0, children: c.isEmpty ? nil : c)
            byID[id] = node
            return node
        }
        guard let root = rootID else { return nil }
        let tree = build(root)
        return (tree.children ?? [], byID)
    }

    /// The node for a page URL path such as `/g/east/freycinet-coles-bay/`.
    static func node(forURLPath p: String, in byID: [String: TreeNode]) -> TreeNode? {
        var path = p.split(separator: "?").first.map(String.init) ?? p
        if path.hasPrefix("/g") { path.removeFirst(2) }
        path = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return byID.values.first { $0.path == path }
    }
}
