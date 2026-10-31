import SwiftUI

struct MenuView: View {
    @EnvironmentObject var app: AppModel
    @State private var query = ""

    var body: some View {
        Group {
            if query.trimmingCharacters(in: .whitespaces).isEmpty {
                List(app.roots, children: \.children, selection: $app.selection) { node in
                    MenuRow(node: node, showClimbs: app.showClimbsInMenu)
                }
            } else {
                List {
                    Section {
                        Button {
                            app.openSearch(query)
                        } label: {
                            Label("Search all guides for “\(query)”", systemImage: "magnifyingglass")
                        }
                    }
                    Section("Titles") {
                        ForEach(matches) { node in
                            Button { app.open(node: node) } label: { MenuRow(node: node, showClimbs: false, path: pathLabel(node)) }
                                .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Guides")
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search guides")
        .onSubmit(of: .search) { app.openSearch(query) }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { app.selection = nil; app.web.open(path: "/g/") } label: { Image(systemName: "house") }
                    .accessibilityLabel("Home")
            }
        }
    }

    private var matches: [TreeNode] {
        let q = query.lowercased()
        return app.byID.values.filter { $0.title.lowercased().contains(q) && !$0.path.isEmpty }.sorted { $0.title < $1.title }.prefix(60).map { $0 }
    }

    private func pathLabel(_ n: TreeNode) -> String? {
        guard let p = n.parent, let parent = app.byID[p], !parent.path.isEmpty else { return nil }
        return parent.title
    }
}

struct MenuRow: View {
    let node: TreeNode
    let showClimbs: Bool
    var path: String?

    var body: some View {
        HStack {
            Image(systemName: node.isGuide ? "mountain.2" : "doc.text").foregroundStyle(.secondary).frame(width: 22)
            VStack(alignment: .leading, spacing: 1) {
                Text(node.title).lineLimit(2)
                if let path { Text(path).font(.caption).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 4)
            if node.climbs > 0 { Text("\(node.climbs)").font(.caption).monospacedDigit().foregroundStyle(.secondary) }
        }
        .tag(node.id)
    }
}
