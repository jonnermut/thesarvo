import Foundation

struct SyncProgress: Equatable, Sendable {
    var phase: String
    var doneBytes: Int64 = 0
    var totalBytes: Int64 = 0
    var doneFiles = 0
    var totalFiles = 0
}

enum SyncError: LocalizedError {
    case badManifest
    case needsNewApp
    case server(Int)
    case changedMidDownload

    var errorDescription: String? {
        switch self {
        case .badManifest: return "The update list could not be read."
        case .needsNewApp: return "A newer version of the app is needed for the latest content."
        case .server(let code): return "The server answered \(code)."
        case .changedMidDownload: return "The guides changed while downloading; try again."
        }
    }
}

/// Checks the manifest, downloads what is missing (verified by hash), and tells the model when a new generation is ready.
/// The pure decisions are in `SyncPlan`; this class is the I/O around it.
actor SyncEngine {
    private let store: BlobStore
    private let session: URLSession
    private var running = false
    static let maxConcurrent = 6

    init(store: BlobStore) {
        self.store = store
        let cfg = URLSessionConfiguration.ephemeral
        cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
        cfg.timeoutIntervalForRequest = 30
        cfg.waitsForConnectivity = false
        self.session = URLSession(configuration: cfg)
    }

    struct Hooks: Sendable {
        /// A manifest is complete for its text files: make it the current generation.
        var switchTo: @Sendable (AppManifest) async -> Void
        /// More blobs arrived for the current manifest: rebuild the path index.
        var refresh: @Sendable () async -> Void
        var progress: @Sendable (SyncProgress) async -> Void
    }

    /// One sync pass. `current` is the manifest in use; returns the manifest now current.
    func run(current: AppManifest?, policy: Policy, allowCellularImages: Bool, hooks: Hooks) async throws -> AppManifest? {
        guard !running else { return current }
        running = true
        defer { running = false }
        var state = store.loadState()
        await hooks.progress(SyncProgress(phase: "Checking for updates"))

        var request = URLRequest(url: AppConfig.manifestURL)
        if let etag = state.etag, current != nil { request.setValue(etag, forHTTPHeaderField: "If-None-Match") }
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        state.lastCheck = Date()
        var manifest = current
        if status == 200 {
            guard let m = try? JSONDecoder().decode(AppManifest.self, from: data), m.schema == 1 else { throw SyncError.badManifest }
            guard m.minShell <= AppConfig.shellVersion else { throw SyncError.needsNewApp }
            try store.saveManifest(data, name: "candidate")
            state.etag = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Etag")
            manifest = m
        } else if status != 304 {
            store.saveState(state)
            throw SyncError.server(status)
        }
        store.saveState(state)
        guard let target = manifest else { return nil }

        var effective = policy
        if freeBytes() < 500_000_000 { effective.m = .none; effective.l = .none }
        let present = store.presentHashes()
        let plan = SyncPlan.diff(target, present: present, policy: effective)
        let isNew = target.contentCommit != current?.contentCommit || target.builtAt != current?.builtAt
        if plan.downloads.isEmpty {
            if isNew { await hooks.switchTo(target) }
            await hooks.progress(SyncProgress(phase: "Up to date"))
            collectGarbage(keeping: [target] + [store.loadManifest("previous")].compactMap { $0 })
            return target
        }

        var progress = SyncProgress(phase: "Downloading", totalBytes: plan.downloads.reduce(0) { $0 + Int64($1.size) }, totalFiles: plan.downloads.count)
        await hooks.progress(progress)
        var switched = !isNew
        var remainingText = plan.downloads.filter { ["shell", "data", "html"].contains($0.kind) }.count
        if remainingText == 0 && !switched {
            switched = true
            await hooks.switchTo(target)
        }
        var next = 0
        var sinceRefresh = 0
        try await withThrowingTaskGroup(of: Download.self) { group in
            func launch() {
                while next < plan.downloads.count {
                    let d = plan.downloads[next]
                    next += 1
                    let isImage = !["shell", "data", "html"].contains(d.kind)
                    if isImage && !allowCellularImages && NetworkState.isExpensive { continue }
                    group.addTask { try await self.fetch(d) }
                    return
                }
            }
            for _ in 0..<Self.maxConcurrent { launch() }
            while let done = try await group.next() {
                progress.doneBytes += Int64(done.size)
                progress.doneFiles += 1
                await hooks.progress(progress)
                if ["shell", "data", "html"].contains(done.kind) {
                    remainingText -= 1
                    if remainingText == 0 && !switched {
                        switched = true
                        await hooks.switchTo(target)
                    }
                } else if switched {
                    sinceRefresh += 1
                    if sinceRefresh >= 40 {
                        sinceRefresh = 0
                        await hooks.refresh()
                    }
                }
                launch()
            }
        }
        if !switched { await hooks.switchTo(target) }
        await hooks.refresh()
        await hooks.progress(SyncProgress(phase: "Up to date", doneBytes: progress.doneBytes, totalBytes: progress.totalBytes, doneFiles: progress.doneFiles, totalFiles: progress.totalFiles))
        collectGarbage(keeping: [target] + [store.loadManifest("previous")].compactMap { $0 })
        return target
    }

    private func fetch(_ d: Download) async throws -> Download {
        var url = AppConfig.baseURL.appendingPathComponent(d.path)
        if !d.path.hasPrefix("images-app/") {
            var c = URLComponents(url: url, resolvingAgainstBaseURL: false)
            c?.queryItems = [URLQueryItem(name: "h", value: d.hash)]
            url = c?.url ?? url
        }
        var lastError: Error = SyncError.badManifest
        for attempt in 0..<3 {
            do {
                let (temp, response) = try await session.download(from: url)
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                guard code == 200 else { throw SyncError.server(code) }
                do { try store.put(temp, as: d.hash) } catch StoreError.hashMismatch { throw SyncError.changedMidDownload }
                return d
            } catch {
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt + 1) * 500_000_000)
            }
        }
        throw lastError
    }

    /// Deletes stored blobs that no kept manifest lists (any variant), after a switch has succeeded.
    private func collectGarbage(keeping manifests: [AppManifest]) {
        var keep = Set<String>()
        for m in manifests { keep.formUnion(SyncPlan.wanted(m, Policy(s: .all, m: .all, l: .all)).map(\.hash)) }
        store.remove(store.storedHashes().subtracting(keep))
    }

    private nonisolated func freeBytes() -> Int64 {
        let v = try? URL(fileURLWithPath: NSHomeDirectory()).resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return v?.volumeAvailableCapacityForImportantUsage ?? Int64.max
    }
}
