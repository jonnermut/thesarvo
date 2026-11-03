import SwiftUI

struct DownloadsView: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Stored on this device", value: format(app.storedBytes))
                    LabeledContent("Guides version", value: String((app.manifest?.contentCommit ?? "seed").prefix(8)))
                    status
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
                Section {
                    Button("Remove downloaded photos", role: .destructive) { app.deleteDownloadedPhotos() }
                }
            }
            .navigationTitle("Downloads")
            .darkBar()
        }
    }

    /// What the downloader is doing now, how much is queued, or when it last checked.
    @ViewBuilder private var status: some View {
        if let p = app.progress, p.phase != "Up to date" {
            progressRow(p)
        } else {
            let w = app.waitingDownloads()
            if w.files > 0 {
                LabeledContent("Waiting to download", value: "\(w.files) \(w.files == 1 ? "file" : "files"), \(format(w.bytes))")
                if !app.online { Text("Waiting for a connection.").font(.footnote).foregroundStyle(.secondary) }
                else if !app.cellularImages && NetworkState.isExpensive { Text("Waiting for Wi-Fi (mobile data is off for photos).").font(.footnote).foregroundStyle(.secondary) }
            } else {
                Label("Everything is downloaded", systemImage: "checkmark.circle").foregroundStyle(.secondary)
            }
            if let d = app.lastCheck { LabeledContent("Last checked", value: d.formatted(.relative(presentation: .named))) }
        }
    }

    @ViewBuilder private func progressRow(_ p: SyncProgress) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(p.totalFiles > 0 ? "\(p.phase): \(p.doneFiles) of \(p.totalFiles) files" : p.phase).font(.subheadline)
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
