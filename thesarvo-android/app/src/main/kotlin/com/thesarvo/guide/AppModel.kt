package com.thesarvo.guide

import android.app.Application
import android.net.Uri
import android.os.Bundle
import android.text.format.Formatter
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.thesarvo.core.AppManifest
import com.thesarvo.core.BridgeMessage
import com.thesarvo.core.ContentsEntry
import com.thesarvo.core.CragPoint
import com.thesarvo.core.EditQueueFormat
import com.thesarvo.core.GenerationIndex
import com.thesarvo.core.Policy
import com.thesarvo.core.Selection
import com.thesarvo.core.SyncPlan
import com.thesarvo.core.Tree
import com.thesarvo.core.TreeNode
import com.thesarvo.core.Variant
import com.thesarvo.guide.auth.AuthSession
import com.thesarvo.guide.store.BlobStore
import com.thesarvo.guide.store.EditQueue
import com.thesarvo.guide.store.PrivateStore
import com.thesarvo.guide.store.PrivateSync
import com.thesarvo.guide.sync.ApiAnswer
import com.thesarvo.guide.sync.ApiClient
import com.thesarvo.guide.sync.NetworkState
import com.thesarvo.guide.sync.SyncEngine
import com.thesarvo.guide.sync.SyncHooks
import com.thesarvo.guide.sync.SyncProgress
import com.thesarvo.guide.sync.SyncResult
import com.thesarvo.guide.work.Workers
import com.thesarvo.guide.web.SiteClient
import com.thesarvo.guide.web.WebModel
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class AppTab { Guides, Map, Downloads, Settings }

class ContentsSheet(val entries: List<ContentsEntry>)

/** Everything the screens show and do: the store, the sync, the web view and the signed-in person. The Android twin of the iOS `AppModel`. */
class AppModel(val app: Application) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    val prefs = Prefs(app)
    val storeRoot = File(app.filesDir, "store").also { it.mkdirs() }
    val store = BlobStore(storeRoot, app.assets)
    val net = NetworkState(app)
    val api = ApiClient(prefs)
    val editQueue = EditQueue(storeRoot)
    val privateStore = PrivateStore(File(app.filesDir, "private"))
    val auth = AuthSession(prefs, app.filesDir)
    val site = SiteClient(store, prefs) { privateStore }
    val engine = SyncEngine(store, prefs, net) { app.filesDir.usableSpace }
    val web: WebModel by lazy { WebModel(app, site) }

    var manifest by mutableStateOf<AppManifest?>(null); private set
    var tree by mutableStateOf<Tree?>(null); private set
    var progress by mutableStateOf<SyncProgress?>(null); private set
    var syncError by mutableStateOf<String?>(null); private set
    var tab by mutableStateOf(AppTab.Guides)
    var selection by mutableStateOf<String?>(null)
    /** The menu level shown (a node with children); null is the top. It follows the page, and you drill from there. */
    var menuFolder by mutableStateOf<String?>(null)
    var showMenu by mutableStateOf(false)
    var contents by mutableStateOf<ContentsSheet?>(null)
    var hasContents by mutableStateOf(false); private set
    var sharedFile by mutableStateOf<BridgeMessage.ShareFile?>(null)
    var external by mutableStateOf<Uri?>(null)
    var recents by mutableStateOf(prefs.recents); private set
    var lastCheck by mutableStateOf<Long?>(null); private set
    var mapFocus by mutableStateOf<String?>(null)
    var pagePoints by mutableStateOf<List<CragPoint>>(emptyList())
    var storedBytes by mutableStateOf(0L); private set
    var online by mutableStateOf(true); private set
    var notice by mutableStateOf<String?>(null)
    var waitingEdits by mutableStateOf(0); private set
    var presentCount by mutableStateOf<Map<String, Int>>(emptyMap()); private set
    var indexVersion by mutableStateOf(0); private set
    val webUpdateNeeded get() = !web.supported

    var firstRunDone by mutableStateOf(prefs.firstRunDone)
    var mode by mutableStateOf(prefs.downloadMode)
    var cellularImages by mutableStateOf(prefs.cellularImages)
    var textScale by mutableStateOf(prefs.textScale)
    var appearance by mutableStateOf(prefs.appearance)
    var showClimbsInMenu by mutableStateOf(prefs.showClimbsInMenu)

    private var generation = GenerationIndex()
    private var syncJob: Job? = null
    private var privateJob: Job? = null
    private var sendingEdits = false
    private var started = false
    private var mapRequested = false
    /** Debug builds: skip the location permission prompt (screenshots). */
    var noLocationPrompt by mutableStateOf(false)

    val policy: Policy get() = mode.policy

    init {
        var state = store.loadState()
        if (state.bootPending) rollBack("The latest update did not load, so the previous guides are back.")
        state = store.loadState()
        if (state.freshSwitch == true) store.saveState(state.copy(freshSwitch = null, bootPending = true))
        manifest = store.loadManifest("current") ?: store.loadSeedManifest()
        lastCheck = store.loadState().lastCheck
        rebuildIndex()
    }

    private fun rollBack(message: String) {
        store.removeManifest("current")
        store.loadManifest("previous")?.let { prev ->
            store.saveManifest(kotlinx.serialization.json.Json.encodeToString(AppManifest.serializer(), prev).toByteArray(), "current")
        }
        store.updateState { it.copy(bootPending = false) }
        notice = message
    }

    // start up

    fun start() {
        if (started) return
        started = true
        web.onMessage = { handle(it) }
        web.onNavigated = { navigated(it) }
        web.presentExternal = { external = it }
        net.watch { on ->
            scope.launch {
                online = on
                if (on) { syncSoon(); sendWaitingEditsLater() }
            }
        }
        migrate()
        auth.onChange = { t ->
            scope.launch {
                web.setAuth(t)
                if (t == null) removePrivateStore() else fillPrivateStore()
            }
        }
        web.setTextScale(textScale)
        web.setTheme(appearance)
        web.setAuth(auth.tokens)
        web.open(prefs.lastPath)
        selectionFollows(prefs.lastPath)
        syncNow()
        fillPrivateStore()
        updateWaitingEdits()
        sendWaitingEdits()
    }

    /// The old app's data (its own folders and the expansion file) is not used any more; remove it once and say hello.
    private fun migrate() {
        if (prefs.migrated) return
        prefs.migrated = true
        val old = listOf(File(app.filesDir, "data"), File(app.filesDir, "index"), app.obbDir).filter { it != null && it.exists() }
        if (old.isEmpty() && !prefs.sp.contains("guideFilesDownloaded")) return
        old.forEach { it.deleteRecursively() }
        notice = "Welcome to the new thesarvo. The guides now update themselves."
    }

    // the page's calls

    private fun handle(m: BridgeMessage) {
        when (m) {
            is BridgeMessage.BootOk -> bootOK()
            is BridgeMessage.Api -> scope.launch { val a = handleAPI(m.method, m.path, m.headers, m.body); web.reply(m.id, a.status, a.body) }
            is BridgeMessage.OpenMap -> openMap(m.guide, m.points)
            is BridgeMessage.ContentsAvailable -> hasContents = m.available
            is BridgeMessage.OpenContents -> contents = ContentsSheet(m.entries)
            is BridgeMessage.ShareFile -> sharedFile = m
            is BridgeMessage.OpenExternal -> external = Uri.parse(m.url)
        }
    }

    /** The page's call to our API, with what the app adds: offline answers for private pages, and the durable edit queue. */
    suspend fun handleAPI(method: String, path: String, headers: Map<String, String>, body: String?): ApiAnswer {
        val t = auth.freshTokens()
        val answer = api.perform(method, path, headers, body, t?.idToken)
        if (answer.status == 0 && t != null && method == "GET") privateStore.offlineAnswer(path)?.let { return it }
        if (method == "POST" && path == EditQueueFormat.SAVE_PATH) {
            val guide = EditQueueFormat.guideId(body)
            val email = auth.user?.email
            if (guide != null && email != null) {
                // The page keeps retrying while it is open; the queue is for when it is not (app closed, web storage evicted).
                if (answer.status == 0) { editQueue.enqueue(guide, email, body ?: ""); updateWaitingEdits() }
                else if (answer.status == 200) { editQueue.remove(guide); updateWaitingEdits() }
            }
        }
        return answer
    }

    private fun sendWaitingEditsLater() { scope.launch { delay(90_000); sendWaitingEdits() } }

    fun updateWaitingEdits() { waitingEdits = editQueue.pending().size }

    fun sendWaitingEdits() {
        val email = auth.user?.email ?: return
        if (sendingEdits || editQueue.pending().isEmpty()) return
        sendingEdits = true
        scope.launch {
            try {
                val t = auth.freshTokens()
                if (t != null) {
                    val n = editQueue.replay(email, t.idToken, api)
                    if (n > 0) notice = if (n == 1) "Sent 1 edit made offline" else "Sent $n edits made offline"
                }
            } finally {
                updateWaitingEdits()
                sendingEdits = false
            }
        }
    }

    /** The app is going to the background: the page may have refreshed its tokens, so keep the vault current. */
    fun onStop() {
        if (!started) return
        web.pageTokens { t -> if (t != null) auth.adopt(t) }
        // A download in progress carries on in the background, as a foreground service with a notification.
        if (syncJob?.isActive == true) { syncJob?.cancel(); Workers.startPhotos(app) }
    }

    fun onStart() {
        if (!started) return
        val last = store.loadState().lastCheck
        if (last == null || System.currentTimeMillis() - last >= 4 * 3600_000L) syncNow()
        // A background refresh may have switched generations while the app was alive but stopped.
        val cur = store.loadManifest("current")
        if (cur != null && cur.builtAt != manifest?.builtAt) scope.launch { switchTo(cur) }
    }

    fun onAuthRedirect(uri: Uri) {
        scope.launch {
            auth.handleCallback(uri)
            if (auth.user != null) {
                notice = "Signed in as ${auth.user?.email}"
                fillPrivateStore()
                sendWaitingEdits()
            }
        }
    }

    fun removePrivateStore() {
        privateJob?.cancel()
        privateJob = null
        privateStore.wipe()
        notice = "Signed out"
    }

    fun fillPrivateStore() {
        if (auth.tokens == null || privateJob != null) return
        privateJob = scope.launch {
            try {
                val t = auth.freshTokens()
                withContext(Dispatchers.IO) { runCatching { PrivateSync.fill(privateStore, t?.idToken, api) } }
            } finally { privateJob = null }
        }
    }

    // index

    fun rebuildIndex() {
        val m = manifest ?: return
        generation = SyncPlan.generation(m, store.presentHashes())
        site.index = generation
        val counts = HashMap<String, Int>()
        for ((key, e) in generation.images) if (e.m != null || e.l != null) counts.merge(key.substringBefore('/'), 1, Int::plus)
        presentCount = counts
        generation.paths["/g-data/manifest.json"]?.let { h -> store.readBytes(h)?.let { Tree.parse(it.decodeToString()) } }?.let { tree = it }
        storedBytes = store.storedBytes()
        indexVersion++
    }

    fun readData(path: String): ByteArray? = generation.paths[path]?.let { store.readBytes(it) }

    fun kmlPaths(): List<String> = generation.paths.keys.filter { it.startsWith("/g-data/kml/") && it.endsWith(".kml") }.sorted()

    // sizes

    fun bytesToDownload(m: DownloadMode): Long {
        val mf = manifest ?: return 0
        return SyncPlan.diff(mf, store.presentHashes(), m.policy).downloads.sumOf { it.size.toLong() }
    }

    fun waitingDownloads(): Pair<Int, Long> {
        val mf = manifest ?: return 0 to 0L
        val d = SyncPlan.diff(mf, store.presentHashes(), policy).downloads
        return d.size to d.sumOf { it.size.toLong() }
    }

    fun sizeLabel(m: DownloadMode): String = bytesToDownload(m).let { if (it == 0L) "on this device" else Formatter.formatFileSize(app, it) }

    fun fileSize(bytes: Long): String = Formatter.formatFileSize(app, bytes)

    val downloading: String?
        get() = progress?.takeIf { it.phase != "Up to date" }?.let { p -> if (p.totalBytes > 0) "${minOf(99, (p.doneBytes * 100 / p.totalBytes).toInt())}%" else "…" }

    // settings

    fun changeMode(m: DownloadMode) { mode = m; prefs.downloadMode = m; syncSoon() }
    fun setCellular(on: Boolean) { cellularImages = on; prefs.cellularImages = on }
    fun changeTextScale(s: Float) { textScale = s; prefs.textScale = s; web.setTextScale(s) }
    fun changeAppearance(a: Appearance) { appearance = a; prefs.appearance = a; web.setTheme(a) }
    fun setShowClimbs(on: Boolean) { showClimbsInMenu = on; prefs.showClimbsInMenu = on }
    fun finishFirstRun(m: DownloadMode) { mode = m; prefs.downloadMode = m; firstRunDone = true; prefs.firstRunDone = true; syncNow() }

    // navigation

    fun folder(id: String?): String? = tree?.folder(id)

    val canEditPage get() = selection?.let { tree?.byId?.get(it) }?.isGuide == true

    val isEditing get() = web.path.contains("edit=true")

    fun toggleEdit(context: android.content.Context) {
        val base = web.path.substringBefore('?')
        if (isEditing) { web.open(base); return }
        if (auth.user != null) { web.open("$base?edit=true"); return }
        auth.signIn(context)
    }

    fun openMenu() { menuFolder = folder(selection); showMenu = true }

    private fun remember(n: TreeNode) {
        if (!n.isGuide) return
        recents = (listOf(n.id) + recents.filter { it != n.id }).take(6)
        prefs.recents = recents
    }

    fun open(node: TreeNode) { showMenu = false; selection = node.id; menuFolder = folder(node.id); tab = AppTab.Guides; web.open(node.url) }

    fun openHome() { showMenu = false; selection = null; menuFolder = null; tab = AppTab.Guides; web.open("/g/") }

    fun openSearch(q: String) {
        showMenu = false; selection = null; menuFolder = null; tab = AppTab.Guides
        web.open("/g/search?q=" + Uri.encode(q))
    }

    fun openGuide(id: String, place: String = "") {
        val t = tree ?: return
        val n = t.byId[id] ?: return
        open(if (place.isEmpty()) n else t.nodeForPlace(id, place) ?: n)
    }

    fun openMap(guide: String?, points: List<CragPoint> = emptyList()) {
        pagePoints = points
        mapFocus = guide
        mapRequested = tab != AppTab.Map
        selectTab(AppTab.Map)
    }

    /** Straight to the map from the bar shows the page's own points (the map drops the focus when the guide has none). */
    fun selectTab(t: AppTab) {
        val was = tab
        tab = t
        if (t == AppTab.Map && was != AppTab.Map) {
            if (mapRequested) mapRequested = false else { pagePoints = emptyList(); mapFocus = selection; web.requestMapPoints() }
        }
    }

    private fun navigated(path: String) {
        prefs.lastPath = path
        selectionFollows(path)
        hasContents = false
    }

    fun selectionFollows(path: String) {
        val n = tree?.nodeForUrlPath(path) ?: return
        remember(n)
        if (n.id != selection) { selection = n.id; menuFolder = folder(n.id) }
    }

    fun areaNames(id: String) = tree?.areaNames(id) ?: emptyList()

    fun bootOK() { store.updateState { it.copy(bootPending = false) } }

    // sync

    /** One slice of a sync with no screen: the refresh worker and the photo service. A new generation waits for the app to open before the page switches to it. */
    suspend fun backgroundSync(deadlineMs: Long, onProgress: (SyncProgress) -> Unit): SyncResult {
        val hooks = object : SyncHooks {
            override suspend fun switchTo(manifest: AppManifest) = withContext(Dispatchers.Main) { store.promoteCandidate(); this@AppModel.manifest = manifest; rebuildIndex() }
            override suspend fun refresh() = withContext(Dispatchers.Main) { rebuildIndex() }
            override suspend fun progress(p: SyncProgress) = onProgress(p)
        }
        val r = withContext(Dispatchers.IO) { engine.run(manifest, policy, cellularImages, hooks, deadlineMs) }
        withContext(Dispatchers.Main) { lastCheck = store.loadState().lastCheck }
        return r
    }

    fun syncSoon() { scope.launch { delay(600); syncNow() } }

    fun syncNow() {
        if (syncJob?.isActive == true) return
        syncError = null
        syncJob = scope.launch {
            val hooks = object : SyncHooks {
                override suspend fun switchTo(manifest: AppManifest) = this@AppModel.switchTo(manifest)
                override suspend fun refresh() = withContext(Dispatchers.Main) { rebuildIndex() }
                override suspend fun progress(p: SyncProgress) = withContext(Dispatchers.Main) { progress = p }
            }
            try {
                withContext(Dispatchers.IO) { engine.run(manifest, policy, cellularImages, hooks) }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                syncError = e.message ?: "The update failed."
            }
            rebuildIndex()
            lastCheck = store.loadState().lastCheck
            progress = null
        }
    }

    private suspend fun switchTo(m: AppManifest) = withContext(Dispatchers.Main) {
        store.promoteCandidate()
        store.updateState { it.copy(bootPending = true) }
        manifest = m
        rebuildIndex()
        web.reload()
        notice = "Guides updated"
        // The page says "bootOK" on its first paint; if it never does, go back to the generation that worked.
        scope.launch {
            delay(20_000)
            if (store.loadState().bootPending) {
                rollBack("The latest update did not load, so the previous guides are back.")
                manifest = store.loadManifest("current") ?: store.loadSeedManifest()
                rebuildIndex()
                web.reload()
            }
        }
        Unit
    }

    fun deleteDownloadedPhotos() {
        val m = manifest ?: return
        changeMode(DownloadMode.Thumbnails)
        val keep = SyncPlan.wanted(m, Policy.thumbnails).map { it.hash }.toSet()
        val drop = SyncPlan.wanted(m, Policy(Selection.None, Selection.All, Selection.All)).map { it.hash }.filter { it !in keep }
        scope.launch(Dispatchers.IO) { store.remove(drop); withContext(Dispatchers.Main) { rebuildIndex() } }
    }

    fun resetStore() {
        syncJob?.cancel()
        store.wipe()
        listOf("current", "previous", "candidate").forEach { store.removeManifest(it) }
        store.saveState(com.thesarvo.guide.store.StoreState())
        manifest = store.loadSeedManifest()
        rebuildIndex()
        web.reload()
    }

    fun deleteAccount(context: android.content.Context) {
        scope.launch {
            val t = auth.freshTokens() ?: return@launch
            val a = api.perform("POST", "/g/api/delete-account", mapOf("content-type" to "application/json"), """{"confirm":"delete"}""", t.idToken)
            if (a.status == 200) { auth.signOut(context); notice = "Your account was deleted" } else notice = "The account could not be deleted. Try again when online."
        }
    }

    /** Debug builds only: launch extras that put the app in a state for tests and screenshots. */
    fun applyDebugExtras(e: Bundle?) {
        if (!BuildConfig.DEBUG || e == null) return
        e.getString("syncBase")?.let { prefs.syncBase = it }
        e.getString("apiBase")?.let { prefs.apiBase = it }
        if (e.containsKey("firstRunDone")) { firstRunDone = e.getBoolean("firstRunDone"); prefs.firstRunDone = firstRunDone }
        e.getString("lastPath")?.let { prefs.lastPath = it; web.open(it) }
        e.getString("fontSizeIndex")?.toIntOrNull()?.let { changeTextScale(listOf(0.85f, 1f, 1.15f, 1.3f, 1.5f).getOrElse(it) { 1f }) }
        e.getString("debugIdToken")?.let { auth.useDebugToken(it); web.setAuth(auth.tokens) }
        e.getString("debugQueueSave")?.let { g ->
            scope.launch { handleAPI("POST", EditQueueFormat.SAVE_PATH, mapOf("content-type" to "application/json"), """{"guide":"$g","session":"s","changes":{"nodes":[]}}""") }
        }
        if (e.getBoolean("noLocationPrompt")) noLocationPrompt = true
        if (e.getBoolean("resetStore")) resetStore()
        if (e.getBoolean("refreshNow")) syncNow()
        if (e.getBoolean("showMenu")) openMenu()
        e.getString("startTab")?.let { s -> selectTab(AppTab.entries.firstOrNull { it.name.equals(s, true) } ?: AppTab.Guides) }
    }

}
