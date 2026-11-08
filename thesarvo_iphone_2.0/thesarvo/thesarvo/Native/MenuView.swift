import SwiftUI

/// The guide menu: one level at a time (tap a row with a chevron to go down, the top row to go back up), opening at the page you are on.
struct MenuView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var query = ""

    var body: some View {
        Group {
            if query.trimmingCharacters(in: .whitespaces).isEmpty {
                List {
                    if let folder {
                        Section {
                            Button { withAnimation { app.menuFolder = parentFolder } } label: {
                                Label(parentTitle, systemImage: "chevron.backward").foregroundStyle(.tint)
                            }
                            Button { app.open(node: folder) } label: { MenuRow(node: folder, title: "\(folder.title) overview", current: app.selection == folder.id) }
                                .buttonStyle(.plain)
                        }
                    } else {
                        Section {
                            Button { app.openHome() } label: {
                                HStack(spacing: 12) { Image(systemName: "house").foregroundStyle(.secondary).frame(width: 26); Text("Home") }
                            }
                            .buttonStyle(.plain)
                            Button { app.openForum() } label: {
                                HStack(spacing: 12) { Image(systemName: "bubble.left.and.bubble.right").foregroundStyle(.secondary).frame(width: 26); Text("Forum") }
                            }
                            .buttonStyle(.plain)
                        }
                        let recent = app.recents.compactMap { app.byID[$0] }
                        if !recent.isEmpty {
                            Section("Recent") {
                                ForEach(recent) { n in
                                    Button { app.open(node: n) } label: { MenuRow(node: n, current: app.selection == n.id) }.buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    Section {
                        ForEach(rows) { n in
                            Button {
                                if n.children != nil { withAnimation { app.menuFolder = n.id } } else { app.open(node: n) }
                            } label: {
                                HStack {
                                    MenuRow(node: n, showClimbs: app.showClimbsInMenu, current: app.selection == n.id)
                                    if n.children != nil { Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary) }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    } header: { if folder == nil { Text("Guides") } }
                }
            } else {
                List {
                    Section {
                        Button { app.openSearch(query) } label: { Label("Search all guides for “\(query)”", systemImage: "magnifyingglass") }
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
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color(Chrome.menu))
        .listRowBackground(Color.white.opacity(0.07))
        .environment(\.colorScheme, .dark)
        .navigationTitle(folder?.title ?? "Guides")
        .darkBar()
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search guides")
        .onSubmit(of: .search) { app.openSearch(query) }
        .toolbar {
            if sizeClass != .regular {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { app.showMenu = false }.tint(.white)
                }
            }
        }
    }

    private var folder: TreeNode? { app.menuFolder.flatMap { app.byID[$0] } }

    private var rows: [TreeNode] { (folder.map { app.byID[$0.id]?.children } ?? app.roots) ?? [] }

    /// One level up: the parent when it is a menu level (it has a path), else the top.
    private var parentFolder: String? {
        guard let p = folder?.parent, let n = app.byID[p], !n.path.isEmpty else { return nil }
        return n.id
    }

    private var parentTitle: String { parentFolder.flatMap { app.byID[$0]?.title } ?? "Guides" }

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
    var title: String?
    var showClimbs = false
    var path: String?
    var current = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: node.isGuide ? "mountain.2" : "doc.text").foregroundStyle(.secondary).frame(width: 26)
            VStack(alignment: .leading, spacing: 1) {
                Text(title ?? node.title).lineLimit(2).fontWeight(current ? .semibold : .regular).foregroundStyle(current ? AnyShapeStyle(.tint) : AnyShapeStyle(.primary))
                if let path { Text(path).font(.caption).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 4)
            if showClimbs, node.climbs > 0 { Text("\(node.climbs)").font(.caption).monospacedDigit().foregroundStyle(.secondary) }
        }
        .contentShape(Rectangle())
    }
}

/// The page's Contents, natively: headings and (optionally) climbs, with a filter; choosing one scrolls the page there.
struct ContentsList: View {
    @EnvironmentObject var app: AppModel
    let sheet: ContentsSheet
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var showClimbs = false

    private var hasBoth: Bool { sheet.entries.contains { $0.isClimb } && sheet.entries.contains { !$0.isClimb } }

    private var shown: [ContentsEntry] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let climbs = showClimbs || !sheet.entries.contains { !$0.isClimb } || !q.isEmpty
        return sheet.entries.filter { e in
            (!e.isClimb || climbs) && (q.isEmpty || e.text.lowercased().contains(q) || (e.grade ?? "").lowercased().contains(q) || (q == "**" && (e.stars ?? "").count >= 2))
        }
    }

    var body: some View {
        NavigationStack {
            List(shown) { e in
                Button {
                    dismiss()
                    app.web.scroll(toAnchor: e.anchor)
                } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        if e.isClimb, let n = e.number, !n.isEmpty { Text(n).font(.caption).foregroundStyle(.secondary).frame(minWidth: 22, alignment: .trailing) }
                        Text(e.text).fontWeight(e.isClimb ? .regular : .medium).foregroundStyle(e.isClimb ? Color.primary : brandTint)
                        Spacer(minLength: 4)
                        if e.isClimb {
                            if let s = e.stars, !s.isEmpty { Text(String(repeating: "★", count: s.count)).font(.caption).foregroundStyle(.orange) }
                            if let g = e.grade { Text(g).font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    .padding(.leading, e.level > 0 ? 14 : 0)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
            .overlay { if shown.isEmpty { Text("Nothing matches").foregroundStyle(.secondary) } }
            .navigationTitle("Contents")
            .darkBar()
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Filter: name, grade, **")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { if hasBoth { Toggle("Climbs", isOn: $showClimbs).toggleStyle(.button).tint(.white) } }
                ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { dismiss() }.tint(.white) }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
