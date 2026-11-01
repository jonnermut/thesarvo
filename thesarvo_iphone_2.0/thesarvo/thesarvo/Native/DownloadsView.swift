import SwiftUI

struct DownloadsView: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Stored on this device", value: format(app.storedBytes))
                    LabeledContent("Guides version", value: String((app.manifest?.contentCommit ?? "seed").prefix(8)))
                    if let p = app.progress { progressRow(p) }
                    if let e = app.syncError { Text(e).font(.footnote).foregroundStyle(.red) }
                    Button { app.syncNow() } label: { Label("Check for updates", systemImage: "arrow.clockwise") }
                }
                Section("Photos") {
                    Picker("Download", selection: $app.mode) {
                        ForEach(DownloadMode.allCases) { Text("\($0.title) (\(app.sizeLabel($0)))").tag($0) }
                    }
                    .pickerStyle(.inline).labelsHidden()
                    Toggle("Use mobile data for photos", isOn: $app.cellularImages)
                }
                if app.mode == .pinned {
                    Section("Chosen guides") {
                        ForEach(guides) { g in
                            Toggle(isOn: Binding(get: { app.pinned.contains(g.id) }, set: { on in
                                if on { app.pinned.insert(g.id) } else { app.pinned.remove(g.id) }
                            })) {
                                VStack(alignment: .leading) {
                                    Text(g.title)
                                    Text(detail(g)).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                Section {
                    Button("Remove downloaded photos", role: .destructive) { app.deleteDownloadedPhotos() }
                }
            }
            .navigationTitle("Downloads")
        }
    }

    private func detail(_ g: TreeNode) -> String {
        let size = format(sizes[g.id] ?? 0)
        guard let c = app.presentCount[g.id] else { return size }
        return "\(size), \(c) photos on device"
    }

    private var sizes: [String: Int64] { app.guideBytes() }

    private var guides: [TreeNode] { app.byID.values.filter { $0.isGuide }.sorted { $0.title < $1.title } }

    @ViewBuilder private func progressRow(_ p: SyncProgress) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(p.phase).font(.subheadline)
            ProgressView(value: Double(p.doneBytes), total: Double(max(p.totalBytes, 1)))
            if p.totalBytes > 0 {
                Text("\(format(p.doneBytes)) of \(format(p.totalBytes))").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func format(_ b: Int64) -> String {
        let f = ByteCountFormatter()
        f.countStyle = .file
        f.allowsNonnumericFormatting = false
        return f.string(fromByteCount: b)
    }
}
