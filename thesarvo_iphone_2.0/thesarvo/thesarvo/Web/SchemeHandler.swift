import Foundation
import WebKit

private final class TaskBox: @unchecked Sendable {
    let task: any WKURLSchemeTask
    init(_ t: any WKURLSchemeTask) { task = t }
}

/// Serves `thesarvo://site/...` from the blob store through the current generation's path index.
final class SchemeHandler: NSObject, WKURLSchemeHandler, @unchecked Sendable {
    private let store: BlobStore
    var privateStore: PrivateStore?
    private let lock = NSLock()
    private var index = GenerationIndex()
    private var stopped = Set<ObjectIdentifier>()
    private let queue = DispatchQueue(label: "thesarvo.scheme", qos: .userInitiated, attributes: .concurrent)
    private let proxySession: URLSession

    init(store: BlobStore) {
        self.store = store
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 20
        proxySession = URLSession(configuration: cfg)
    }

    func setIndex(_ i: GenerationIndex) {
        lock.lock()
        index = i
        lock.unlock()
    }

    private func currentIndex() -> GenerationIndex {
        lock.lock()
        defer { lock.unlock() }
        return index
    }

    func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
        let box = TaskBox(task)
        let request = task.request
        guard let url = request.url else {
            finish(box, status: 400, headers: [:], body: Data())
            return
        }
        if url.path.hasPrefix(PrivateStore.imagePrefix) {
            queue.async { [self] in
                guard let file = privateStore?.imageFile(forPath: url.path), let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
                    finish(box, status: 404, headers: ["Content-Type": "text/plain"], body: Data("Not found".utf8))
                    return
                }
                finish(box, status: 200, headers: ["Content-Type": "image/jpeg", "Cache-Control": "private, no-store"], body: data)
            }
            return
        }
        let resolved = PathResolver.resolve(path: url.path, query: url.query, index: currentIndex())
        switch resolved {
        case .blob(let hash, let mime):
            queue.async { [self] in
                guard let file = store.url(for: hash), let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
                    finish(box, status: 404, headers: [:], body: Data())
                    return
                }
                let isHTML = mime.hasPrefix("text/html")
                finish(box, status: 200, headers: ["Content-Type": mime, "Cache-Control": isHTML ? "no-store" : "public, max-age=31536000, immutable"], body: data)
            }
        case .proxy:
            proxy(box, request: request, url: url)
        case .notFound:
            // Only the handler answers 404 here; the "API routes never 404" rule is for the CloudFront API, which this never reaches.
            finish(box, status: 404, headers: ["Content-Type": "text/plain"], body: Data("Not found".utf8))
        }
    }

    func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {
        lock.lock()
        stopped.insert(ObjectIdentifier(task))
        lock.unlock()
    }

    /// Online-only things (the API, history, an image variant not on the device) go to the real server; offline they fail cleanly.
    private func proxy(_ box: TaskBox, request: URLRequest, url: URL) {
        guard var comps = URLComponents(url: AppConfig.baseURL, resolvingAgainstBaseURL: false) else {
            finish(box, status: 502, headers: [:], body: Data())
            return
        }
        comps.path = url.path
        comps.percentEncodedQuery = url.query
        guard let target = comps.url else {
            finish(box, status: 502, headers: [:], body: Data())
            return
        }
        var out = URLRequest(url: target)
        out.httpMethod = request.httpMethod
        out.httpBody = request.httpBody
        for (k, v) in request.allHTTPHeaderFields ?? [:] where ["content-type", "accept", "authorization"].contains(k.lowercased()) { out.setValue(v, forHTTPHeaderField: k) }
        let session = proxySession
        Task.detached { [self] in
            do {
                let (data, response) = try await session.data(for: out)
                let http = response as? HTTPURLResponse
                var headers: [String: String] = [:]
                if let t = http?.value(forHTTPHeaderField: "Content-Type") { headers["Content-Type"] = t }
                headers["Cache-Control"] = "no-store"
                finish(box, status: http?.statusCode ?? 502, headers: headers, body: data)
            } catch {
                finish(box, status: 503, headers: ["Content-Type": "application/json", "X-Thesarvo-Offline": "1"], body: Data("{\"offline\":true}".utf8))
            }
        }
    }

    private func finish(_ box: TaskBox, status: Int, headers: [String: String], body: Data) {
        DispatchQueue.main.async { [self] in
            let id = ObjectIdentifier(box.task)
            lock.lock()
            let wasStopped = stopped.remove(id) != nil
            lock.unlock()
            if wasStopped { return }
            var h = headers
            h["Content-Length"] = String(body.count)
            guard let url = box.task.request.url, let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: h) else { return }
            box.task.didReceive(response)
            box.task.didReceive(body)
            box.task.didFinish()
        }
    }
}
