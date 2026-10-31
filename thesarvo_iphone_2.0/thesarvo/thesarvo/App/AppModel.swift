import Foundation
import SwiftUI
import WebKit

enum AppTab: Hashable { case guides, map, downloads, settings }

enum DownloadMode: String, CaseIterable, Identifiable {
    case thumbnails, pinned, allPhotos, fullQuality
    var id: String { rawValue }
    var title: String {
        switch self {
        case .thumbnails: return "Small pictures only"
        case .pinned: return "Photos for chosen guides"
        case .allPhotos: return "All photos"
        case .fullQuality: return "All photos, full quality"
        }
    }
}

@MainActor
final class AppModel: ObservableObject {
    let store = BlobStore()
    lazy var privateStore = PrivateStore(storeRoot: store.root)
    let handler: SchemeHandler
    let engine: SyncEngine
    let web: WebModel
    let auth = AuthSession()
    private var privateTask: Task<Void, Never>?

    @Published var manifest: AppManifest?
    @Published var roots: [TreeNode] = []
    @Published var byID: [String: TreeNode] = [:]
    @Published var progress: SyncProgress?
    @Published var syncError: String?
    @Published var tab: AppTab = .guides
    @Published var selection: String?
    @Published var mapFocus: String?
    /// The GPS points a page sent with its Map button; they stand in for that guide's KML points.
    @Published var pagePoints: [CragPoint] = []
    @Published var storedBytes: Int64 = 0
    @Published var online = true
    @Published var notice: String?
    @Published var external: URL?
    @Published var presentCount: [String: Int] = [:]

    @Published var firstRunDone: Bool { didSet { UserDefaults.standard.set(firstRunDone, forKey: "firstRunDone") } }
    @Published var mode: DownloadMode { didSet { UserDefaults.standard.set(mode.rawValue, forKey: "downloadMode"); syncSoon() } }
    @Published var pinned: Set<String> { didSet { UserDefaults.standard.set(Array(pinned), forKey: "pinnedGuides"); if mode == .pinned { syncSoon() } } }
    @Published var cellularImages: Bool { didSet { UserDefaults.standard.set(cellularImages, forKey: "cellularImages") } }
    @Published var textScale: Double { didSet { UserDefaults.standard.set(textScale, forKey: "textScale"); web.setTextScale(textScale) } }
    @Published var showClimbsInMenu: Bool { didSet { UserDefaults.standard.set(showClimbsInMenu, forKey: "showClimbsInTOC") } }

    private var generation = GenerationIndex()
    private var syncTask: Task<Void, Never>?
    private var started = false

    init() {
        let d = UserDefaults.standard
        handler = SchemeHandler(store: store)
        engine = SyncEngine(store: store)
        web = WebModel(handler: handler)
        mode = DownloadMode(rawValue: d.string(forKey: "downloadMode") ?? "") ?? .thumbnails
        pinned = Set(d.stringArray(forKey: "pinnedGuides") ?? [])
        cellularImages = d.bool(forKey: "cellularImages")
        firstRunDone = d.bool(forKey: "firstRunDone")
        let scale = d.double(forKey: "textScale")
        textScale = scale > 0 ? scale : 1.0
        showClimbsInMenu = d.bool(forKey: "showClimbsInTOC")

        var state = store.loadState()
        if state.bootPending {
            // The last switch never reached a first paint: go back to the generation that worked (the seed when there was none).
            store.removeManifest("current")
            if let prev = store.loadManifest("previous"), let data = try? JSONEncoder().encode(prev) { try? store.saveManifest(data, name: "current") }
            state.bootPending = false
            store.saveState(state)
            notice = "The latest update did not load, so the previous guides are back."
        }
        if state.freshSwitch == true {
            // A background refresh switched generations: this first launch on it is guarded like a foreground switch.
            state.freshSwitch = nil
            state.bootPending = true
            store.saveState(state)
        }
        manifest = store.loadManifest("current") ?? store.loadSeedManifest()
        web.setTextScale(textScale)
        web.onBootOK = { [weak self] in self?.bootOK() }
        web.onOpenMap = { [weak self] g, pts in self?.openMap(guide: g, points: pts) }
        web.presentExternal = { [weak self] u in self?.external = u }
        web.onNavigated = { [weak self] p in self?.navigated(to: p) }
        rebuildIndex()
    }

    var policy: Policy { Policy(mode: mode, pinned: pinned) }

    /// What a photo mode would still download (bytes), from the current manifest and what is on the device.
    func bytesToDownload(_ m: DownloadMode) -> Int64 {
        guard let manifest else { return 0 }
        let p = Policy(mode: m, pinned: pinned)
        return SyncPlan.diff(manifest, present: store.presentHashes(), policy: p).downloads.reduce(Int64(0)) { $0 + Int64($1.size) }
    }

    func sizeLabel(_ m: DownloadMode) -> String {
        let b = bytesToDownload(m)
        return b == 0 ? "on this device" : ByteCountFormatter.string(fromByteCount: b, countStyle: .file)
    }

    /// Size of one guide's standard photos (all of it, present or not).
    func guideBytes() -> [String: Int64] {
        var out: [String: Int64] = [:]
        for im in manifest?.images ?? [] { out[im.g, default: 0] += Int64(im.variant(.m)?.size ?? 0) }
        return out
    }

    // MARK: start up

    func start() {
        guard !started else { return }
        started = true
        handler.privateStore = privateStore
        NetworkState.start { [weak self] isOnline in Task { @MainActor in self?.online = isOnline; if isOnline { self?.syncSoon() } } }
        Migration.run(model: self)
        NotificationCenter.default.addObserver(forName: BackgroundRefresh.didSwitch, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.reloadFromStore() }
        }
        web.onAPI = { [weak self] r in
            let t = await self?.auth.freshTokens()
            let answer = await BridgeAPI.perform(r, idToken: t?.idToken)
            // Offline, a signed-in person's private pages come from the private store.
            if answer.status == 0, t != nil, r.method == "GET", let stored = self?.privateStore.offlineAnswer(path: r.path) { return stored }
            return answer
        }
        auth.onChange = { [weak self] tokens in
            self?.web.setAuth(tokens)
            if tokens == nil { self?.removePrivateStore() } else { self?.fillPrivateStore() }
        }
        web.setAuth(auth.tokens)
        let last = UserDefaults.standard.string(forKey: "lastPath") ?? "/g/"
        web.open(path: last)
        selectionFollows(path: last)
        if let id = Migration.pendingGuideID, let n = byID[id] {
            Migration.pendingGuideID = nil
            open(node: n)
        }
        if let m = manifest { _ = m }
        #if DEBUG
        if CommandLine.arguments.contains("-bgRefreshNow") { Task { notice = "Background refresh: \(await BackgroundRefresh.run() ? "ok" : "failed")" } }
        #endif
        syncNow()
        fillPrivateStore()
    }

    /// Called when the app goes to the background: the page may have refreshed its tokens, so keep the Keychain current.
    func sceneBackground() {
        AppDelegate.schedule()
        Task { if let t = await web.pageTokens() { auth.adopt(t) } }
    }

    /// Everything downloaded for the signed-in person's private guides; sign-out removes it (it is a separate directory, never the public store).
    func removePrivateStore() {
        privateTask?.cancel()
        privateStore.wipe()
        notice = "Signed out"
    }

    /// Downloads the signed-in person's private pages and photos for offline use (the server decides what they may read).
    func fillPrivateStore() {
        guard auth.tokens != nil, privateTask == nil else { return }
        privateTask = Task { [weak self] in
            guard let self else { return }
            let t = await auth.freshTokens()
            _ = try? await PrivateSync.fill(store: privateStore, idToken: t?.idToken)
            privateTask = nil
        }
    }

    func sceneActive() {
        let last = store.loadState().lastCheck
        if let last, Date().timeIntervalSince(last) < 4 * 3600 { return }
        syncNow()
    }

    // MARK: index

    func rebuildIndex() {
        guard let m = manifest else { return }
        let present = store.presentHashes()
        generation = SyncPlan.generation(m, present: present)
        handler.setIndex(generation)
        var counts: [String: Int] = [:]
        for (key, e) in generation.images where e.m != nil || e.l != nil { counts[String(key.prefix { $0 != "/" }), default: 0] += 1 }
        presentCount = counts
        if let h = generation.paths["/g-data/manifest.json"], let u = store.url(for: h), let data = try? Data(contentsOf: u), let t = TreeLoader.parse(data) {
            roots = t.roots
            byID = t.byID
        }
        storedBytes = store.storedBytes()
    }

    func readData(_ path: String) -> Data? {
        guard let h = generation.paths[path], let u = store.url(for: h) else { return nil }
        return try? Data(contentsOf: u)
    }

    func kmlPaths() -> [String] {
        generation.paths.keys.filter { $0.hasPrefix("/g-data/kml/") && $0.hasSuffix(".kml") }.sorted()
    }

    // MARK: navigation

    /// Bumped when something other than a menu row opens a page, so a collapsed split view (iPhone) shows the page.
    @Published var revealPage = 0

    func open(node: TreeNode) {
        selection = node.id
        tab = .guides
        revealPage += 1
        web.open(path: node.url)
    }

    func openSearch(_ q: String) {
        let enc = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q
        selection = nil
        tab = .guides
        revealPage += 1
        web.open(path: "/g/search?q=\(enc)")
    }

    func openGuide(id: String) {
        if let n = byID[id] { open(node: n) }
    }

    func openMap(guide: String?, points: [CragPoint] = []) {
        pagePoints = points
        mapFocus = guide
        tab = .map
    }

    private func navigated(to path: String) {
        UserDefaults.standard.set(path, forKey: "lastPath")
        selectionFollows(path: path)
    }

    private func selectionFollows(path: String) {
        if let n = TreeLoader.node(forURLPath: path, in: byID), n.id != selection { selection = n.id }
    }

    func bootOK() {
        var s = store.loadState()
        if s.bootPending { s.bootPending = false; store.saveState(s) }
    }

    // MARK: sync

    /// A background refresh made a newer generation current while the app was alive but suspended.
    private func reloadFromStore() {
        guard let m = store.loadManifest("current"), m.builtAt != manifest?.builtAt else { return }
        manifest = m
        rebuildIndex()
        web.reload()
    }

    func syncSoon() {
        Task { try? await Task.sleep(nanoseconds: 600_000_000); syncNow() }
    }

    func syncNow() {
        guard syncTask == nil else { return }
        let policy = self.policy
        let current = manifest
        let cellular = cellularImages
        syncError = nil
        syncTask = Task { [weak self] in
            guard let self else { return }
            let hooks = SyncEngine.Hooks(
                switchTo: { [weak self] m in await self?.switchTo(m) },
                refresh: { [weak self] in await self?.refreshAfterDownloads() },
                progress: { [weak self] p in await self?.setProgress(p) }
            )
            do {
                _ = try await engine.run(current: current, policy: policy, allowCellularImages: cellular, hooks: hooks)
            } catch {
                syncError = error.localizedDescription
                progress = nil
            }
            rebuildIndex()
            syncTask = nil
        }
    }

    private func setProgress(_ p: SyncProgress) { progress = p }

    private func refreshAfterDownloads() {
        rebuildIndex()
    }

    private func switchTo(_ m: AppManifest) {
        store.promoteCandidate()
        var s = store.loadState()
        s.bootPending = true
        store.saveState(s)
        manifest = m
        rebuildIndex()
        web.reload()
        notice = "Guides updated"
    }

    func deleteDownloadedPhotos() {
        guard let m = manifest else { return }
        mode = .thumbnails
        let keep = Set(SyncPlan.wanted(m, .thumbnails).map(\.hash))
        let drop = SyncPlan.wanted(m, Policy(s: .none, m: .all, l: .all)).map(\.hash).filter { !keep.contains($0) }
        store.remove(drop)
        rebuildIndex()
    }

    func resetStore() {
        store.wipe()
        store.removeManifest("current")
        store.removeManifest("previous")
        store.removeManifest("candidate")
        store.saveState(BlobStore.State())
        manifest = store.loadSeedManifest()
        rebuildIndex()
        web.reload()
    }
}

extension Policy {
    init(mode: DownloadMode, pinned: Set<String>) {
        switch mode {
        case .thumbnails: self = .thumbnails
        case .pinned: self = Policy(s: .all, m: .guides(pinned), l: .none)
        case .allPhotos: self = Policy(s: .all, m: .all, l: .none)
        case .fullQuality: self = Policy(s: .all, m: .all, l: .all)
        }
    }
}
