import Foundation

/// Image downloads in a background `URLSession`, so they carry on when the app is suspended or closed and finished files are
/// delivered (and stored, verified by hash) the next time the system wakes the app. Text files use the foreground session in `SyncEngine`.
final class BackgroundDownloader: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
    static let identifier = "com.thesarvo.guide.sync.images"
    static let shared = BackgroundDownloader()
    /// Set by the app delegate when the system relaunches the app for this session; called once its events are delivered.
    nonisolated(unsafe) static var eventsCompletion: (() -> Void)?

    private let store = BlobStore()
    private let lock = NSLock()
    private var pending = Set<String>()
    private var failed = 0
    private var waiter: CheckedContinuation<Void, Never>?
    private var onEach: (@Sendable (String) -> Void)?

    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.background(withIdentifier: Self.identifier)
        cfg.sessionSendsLaunchEvents = true
        cfg.allowsConstrainedNetworkAccess = false
        cfg.httpMaximumConnectionsPerHost = SyncEngine.maxConcurrent
        cfg.timeoutIntervalForResource = 7 * 24 * 3600
        return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }()

    private override init() { super.init() }

    /// Touching the session at launch reconnects it to downloads that finished while the app was not running.
    func reconnect() { _ = session }

    /// Queues the files (skipping any already in flight from an earlier run) and returns when all of them have finished; `each` is
    /// called with the hash of every file stored. Returns how many failed.
    func download(_ items: [Download], cellular: Bool, each: @escaping @Sendable (String) -> Void) async -> Int {
        let inFlight = Set(await session.allTasks.compactMap(\.taskDescription))
        lock.lock()
        pending = Set(items.map(\.hash))
        failed = 0
        onEach = each
        lock.unlock()
        for d in items where !inFlight.contains(d.hash) {
            var request = URLRequest(url: AppConfig.baseURL.appendingPathComponent(d.path))
            request.allowsCellularAccess = cellular
            let task = session.downloadTask(with: request)
            task.taskDescription = d.hash
            task.resume()
        }
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            lock.lock()
            if pending.isEmpty { lock.unlock(); c.resume() } else { waiter = c; lock.unlock() }
        }
        lock.lock()
        defer { lock.unlock() }
        onEach = nil
        return failed
    }

    private func finish(_ hash: String, ok: Bool) {
        lock.lock()
        guard pending.remove(hash) != nil else { lock.unlock(); return }
        if !ok { failed += 1 }
        let callback = onEach
        let w = pending.isEmpty ? waiter : nil
        if w != nil { waiter = nil }
        lock.unlock()
        if ok { callback?(hash) }
        w?.resume()
    }

    // MARK: URLSessionDownloadDelegate

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let hash = downloadTask.taskDescription else { return }
        let code = (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0
        // The file is deleted when this returns, so it is hashed and moved now (a wrong hash or a non-200 body is refused).
        let ok = code == 200 && (try? store.put(location, as: hash)) != nil
        finish(hash, ok: ok)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if error != nil, let hash = task.taskDescription { finish(hash, ok: false) }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            Self.eventsCompletion?()
            Self.eventsCompletion = nil
        }
    }
}
