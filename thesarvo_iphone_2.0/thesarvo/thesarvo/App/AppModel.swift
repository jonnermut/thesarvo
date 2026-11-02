import Foundation
import SwiftUI
import WebKit

enum AppTab: Hashable { case guides, map, downloads, settings }

enum DownloadMode: String, CaseIterable, Identifiable {
    case thumbnails, allPhotos, fullQuality
    var id: String { rawValue }
    var title: String {
        switch self {
        case .thumbnails: return "Small pictures only"
        case .allPhotos: return "All photos"
        case .fullQuality: return "All photos, full quality"
        }
    }
}

struct ContentsSheet: Identifiable { let id = UUID(); let entries: [ContentsEntry] }

@MainActor
final class AppModel: ObservableObject {
    let store = BlobStore()
    lazy var editQueue = EditQueue(storeRoot: store.root)
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
    /// While something is downloading: the percentage (or an ellipsis before the size is known), for the Downloads tab's badge.
    var downloading: String? {
        guard let p = progress, p.phase != "Up to date" else { return nil }
        return p.totalBytes > 0 ? "\(min(99, Int(p.doneBytes * 100 / p.totalBytes)))%" : "…"
    }
    @Published var syncError: String?
    @Published var tab: AppTab = .guides {
        didSet {
            guard tab == .map, oldValue != .map else { return }
            // Straight to the map from the tab bar: show the page's own points (the map drops the focus when the guide has none).
            if mapRequested { mapRequested = false } else { pagePoints = []; mapFocus = selection; web.requestMapPoints() }
        }
    }
    /// `openMap` sets the focus itself, so the tab change that follows must not replace it.
    private var mapRequested = false
    @Published var selection: String? { didSet { if selection != oldValue { menuFolder = folder(for: selection) } } }
    /// The menu level shown (a node with children); nil is the top. It follows the page you are on, and you drill from there.
    @Published var menuFolder: String?
    @Published var showMenu = false
    @Published var contents: ContentsSheet?
    /// The page has a contents list, so the top bar shows a Contents button.
    @Published var hasContents = false
    @Published var sharedFile: SharedFile?
    /// Guides opened lately, newest first (ids), kept on this device.
    @Published var recents: [String] = UserDefaults.standard.stringArray(forKey: "recentGuides") ?? []
    @Published var lastCheck: Date?
    @Published var mapFocus: String?
    /// The GPS points a page sent with its Map button; they stand in for that guide's KML points.
    @Published var pagePoints: [CragPoint] = []
    @Published var storedBytes: Int64 = 0
    @Published var online = true
    @Published var notice: String?
    @Published var waitingEdits = 0
    private var sendingEdits = false
    @Published var external: URL?
    @Published var presentCount: [String: Int] = [:]

    @Published var firstRunDone: Bool { didSet { UserDefaults.standard.set(firstRunDone, forKey: "firstRunDone") } }
    @Published var mode: DownloadMode { didSet { UserDefaults.standard.set(mode.rawValue, forKey: "downloadMode"); syncSoon() } }
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
        lastCheck = store.loadState().lastCheck
        web.onContentsAvailable = { [weak self] on in self?.hasContents = on }
        web.onOpenContents = { [weak self] e in self?.contents = ContentsSheet(entries: e) }
        web.onOpenMap = { [weak self] g, pts in self?.openMap(guide: g, points: pts) }
        web.onShareFile = { [weak self] n, t in self?.sharedFile = SharedFile.make(name: n, text: t) }
        web.presentExternal = { [weak self] u in self?.external = u }
        web.onNavigated = { [weak self] p in self?.navigated(to: p) }
        rebuildIndex()
    }

    var policy: Policy { Policy(mode: mode) }

    /// What a photo mode would still download (bytes), from the current manifest and what is on the device.
    func bytesToDownload(_ m: DownloadMode) -> Int64 {
        guard let manifest else { return 0 }
        let p = Policy(mode: m)
        return SyncPlan.diff(manifest, present: store.presentHashes(), policy: p).downloads.reduce(Int64(0)) { $0 + Int64($1.size) }
    }

    /// What the current choice still has to download (files and bytes).
    func waitingDownloads() -> (files: Int, bytes: Int64) {
        guard let manifest else { return (0, 0) }
        let d = SyncPlan.diff(manifest, present: store.presentHashes(), policy: policy).downloads
        return (d.count, d.reduce(Int64(0)) { $0 + Int64($1.size) })
    }

    func sizeLabel(_ m: DownloadMode) -> String {
        let b = bytesToDownload(m)
        return b == 0 ? "on this device" : ByteCountFormatter.string(fromByteCount: b, countStyle: .file)
    }

    // MARK: start up

    func start() {
        guard !started else { return }
        started = true
        handler.privateStore = privateStore
        NetworkState.start { [weak self] isOnline in Task { @MainActor in self?.online = isOnline; if isOnline { self?.syncSoon(); self?.sendWaitingEditsLater() } } }
        Migration.run(model: self)
        NotificationCenter.default.addObserver(forName: BackgroundRefresh.didSwitch, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.reloadFromStore() }
        }
        web.onAPI = { [weak self] r in await self?.handleAPI(r) ?? (0, "") }
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
        updateWaitingEdits()
        sendWaitingEdits()
        #if DEBUG
        if let g = UserDefaults.standard.string(forKey: "debugQueueSave") { // simulator test: a save the page could not send, through the real path
            Task { _ = await handleAPI(BridgeRequest(["id": 0, "method": "POST", "path": EditQueue.savePath, "headers": ["content-type": "application/json"], "body": "{\"guide\":\"\(g)\",\"session\":\"s\",\"changes\":{\"nodes\":[]}}"])!) }
        }
        #endif
    }

    /// The page's call to our API (see `BridgeAPI`), with what the app adds: offline answers for private pages, and the durable edit queue.
    func handleAPI(_ r: BridgeRequest) async -> (status: Int, body: String) {
        let t = await auth.freshTokens()
        let answer = await BridgeAPI.perform(r, idToken: t?.idToken)
        if answer.status == 0, t != nil, r.method == "GET", let stored = privateStore.offlineAnswer(path: r.path) { return stored }
        if r.method == "POST", r.path == EditQueue.savePath, let guide = EditQueue.guideID(inSaveBody: r.body), let email = auth.user?.email {
            // The page keeps retrying while it is open; the queue is for when it is not (app closed, web storage evicted).
            if answer.status == 0 { editQueue.enqueue(guide: guide, email: email, body: r.body ?? ""); updateWaitingEdits() }
            else if answer.status == 200 { editQueue.remove(guide: guide); updateWaitingEdits() }
        }
        return answer
    }

    /// On reconnect the open page gets the first go at its own retry (success removes the entry); the queue follows.
    func sendWaitingEditsLater() {
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 90_000_000_000)
            self?.sendWaitingEdits()
        }
    }

    func updateWaitingEdits() { waitingEdits = editQueue.pending().count }

    /// Sends edits queued earlier for the signed-in person.
    func sendWaitingEdits() {
        guard let email = auth.user?.email, !editQueue.pending().isEmpty, sendingEdits == false else { return }
        sendingEdits = true
        Task { [weak self] in
            guard let self else { return }
            if let t = await auth.freshTokens() {
                let n = await editQueue.replay(email: email, idToken: t.idToken)
                if n > 0 { notice = n == 1 ? "Sent 1 edit made offline" : "Sent \(n) edits made offline" }
            }
            updateWaitingEdits()
            sendingEdits = false
        }
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

    /// The menu level that shows this page: the page's own children when it has some, else its parent's.
    func folder(for id: String?) -> String? {
        guard let id, let n = byID[id] else { return nil }
        guard let f = n.children != nil ? n.id : n.parent, let fn = byID[f], !fn.path.isEmpty else { return nil }
        return f
    }

    /// Guides (not folders) can be edited: the same editor as the website, which asks you to sign in first.
    var canEditPage: Bool { selection.flatMap { byID[$0] }?.isGuide == true }

    var isEditing: Bool { web.path.contains("edit=true") }

    func toggleEdit() {
        let base = web.path.split(separator: "?", maxSplits: 1).first.map(String.init) ?? web.path
        if isEditing { web.open(path: base); return }
        if auth.user != nil { web.open(path: base + "?edit=true"); return }
        Task {
            await auth.signIn()
            if auth.user != nil { web.open(path: base + "?edit=true") }
        }
    }

    func openMenu() {
        menuFolder = folder(for: selection)
        showMenu = true
    }

    private func remember(_ n: TreeNode) {
        guard n.isGuide else { return }
        recents = Array(([n.id] + recents.filter { $0 != n.id }).prefix(6))
        UserDefaults.standard.set(recents, forKey: "recentGuides")
    }

    func open(node: TreeNode) {
        showMenu = false
        selection = node.id
        tab = .guides
        revealPage += 1
        web.open(path: node.url)
    }

    func openHome() {
        showMenu = false
        selection = nil
        tab = .guides
        web.open(path: "/g/")
    }

    func openSearch(_ q: String) {
        let enc = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q
        showMenu = false
        selection = nil
        tab = .guides
        revealPage += 1
        web.open(path: "/g/search?q=\(enc)")
    }

    /// The names of a node's ancestors below the top (widest first), then its own: "South East", "Eldon".
    func areaNames(for id: String) -> [String] {
        var out: [String] = []
        var n = byID[id]
        while let node = n, !node.path.isEmpty { out.insert(node.title, at: 0); n = node.parent.flatMap { byID[$0] } }
        return out
    }

    /// Opens a guide; a point's `place` (its KML folder) opens the page of that name below the guide when there is one ("Gerny Hill" under "Clear Hill Road").
    func openGuide(id: String, place: String = "") {
        guard let n = byID[id] else { return }
        func find(_ node: TreeNode) -> TreeNode? {
            for c in node.children ?? [] { if c.title.caseInsensitiveCompare(place) == .orderedSame { return c }; if let d = find(c) { return d } }
            return nil
        }
        open(node: place.isEmpty ? n : find(n) ?? n)
    }

    func openMap(guide: String?, points: [CragPoint] = []) {
        pagePoints = points
        mapFocus = guide
        mapRequested = tab != .map
        tab = .map
    }

    private func navigated(to path: String) {
        UserDefaults.standard.set(path, forKey: "lastPath")
        selectionFollows(path: path)
    }

    func selectionFollows(path: String) {
        if let n = TreeLoader.node(forURLPath: path, in: byID) {
            remember(n)
            if n.id != selection { selection = n.id }
        }
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
            lastCheck = store.loadState().lastCheck
            progress = nil
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
    init(mode: DownloadMode) {
        switch mode {
        case .thumbnails: self = .thumbnails
        case .allPhotos: self = Policy(s: .all, m: .all, l: .none)
        case .fullQuality: self = Policy(s: .all, m: .all, l: .all)
        }
    }
}
