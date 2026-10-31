import SafariServices
import SwiftUI
import WebKit

/// The one long-lived `WKWebView` that shows the site's pages from the local store.
@MainActor
final class WebModel: NSObject, ObservableObject, WKNavigationDelegate, WKScriptMessageHandler, WKUIDelegate {
    let webView: WKWebView
    @Published var title = ""
    @Published var path = "/g/"
    @Published var canGoBack = false
    @Published var isLoading = false

    var onOpenMap: ((String?, [CragPoint]) -> Void)?
    var onBootOK: (() -> Void)?
    var onNavigated: ((String) -> Void)?
    var presentExternal: ((URL) -> Void)?
    var onAPI: ((BridgeRequest) async -> (status: Int, body: String))?
    private let controller: WKUserContentController

    private var observers: [NSKeyValueObservation] = []

    /// Tells the page it runs in the app before it starts; the site's own stylesheet hides its header, side tree and footer for `data-app`.
    private static let appModeScript = """
    (function () {
      window.thesarvoApp = { bridge: \(AppConfig.bridgeVersion), platform: 'ios' };
      document.documentElement.setAttribute('data-app', 'ios');
      var post = function (m) { try { window.webkit.messageHandlers.thesarvo.postMessage(m); } catch (e) {} };
      window.addEventListener('load', function () { post({ type: 'bootOK' }); });
    })();
    """

    init(handler: SchemeHandler) {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(handler, forURLScheme: AppConfig.originScheme)
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        let controller = WKUserContentController()
        self.controller = controller
        controller.addUserScript(WKUserScript(source: Self.appModeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = controller
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        controller.add(WeakScriptHandler(self), name: "thesarvo")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = true
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        observers = [
            webView.observe(\.title) { [weak self] w, _ in Task { @MainActor in self?.title = w.title ?? "" } },
            webView.observe(\.canGoBack) { [weak self] w, _ in Task { @MainActor in self?.canGoBack = w.canGoBack } },
            webView.observe(\.isLoading) { [weak self] w, _ in Task { @MainActor in self?.isLoading = w.isLoading } },
            webView.observe(\.url) { [weak self] w, _ in
                Task { @MainActor in
                    guard let self, let u = w.url, u.scheme == AppConfig.originScheme else { return }
                    let p = u.path + (u.query.map { "?" + $0 } ?? "")
                    self.path = p
                    self.onNavigated?(p)
                }
            },
        ]
    }

    func open(path: String) {
        guard let url = URL(string: AppConfig.originURL.absoluteString + path) else { return }
        webView.load(URLRequest(url: url))
    }

    /// Gives the page the signed-in tokens in the place the website's own session code keeps them (or removes them), now and on every load.
    func setAuth(_ tokens: Tokens?) {
        let js: String
        if let tokens, let d = try? JSONEncoder().encode(tokens), let s = String(data: d, encoding: .utf8) {
            let quoted = (try? JSONSerialization.data(withJSONObject: [s])).flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
            js = "try { localStorage.setItem('thesarvo.auth', \(quoted)[0]); } catch (e) {}"
        } else {
            js = "try { localStorage.removeItem('thesarvo.auth'); } catch (e) {}"
        }
        controller.removeAllUserScripts()
        controller.addUserScript(WKUserScript(source: Self.appModeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        controller.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView.evaluateJavaScript(js + " window.dispatchEvent(new StorageEvent('storage', { key: 'thesarvo.auth' }));")
    }

    /// The tokens the page holds now (it refreshes them itself), for the Keychain.
    func pageTokens() async -> Tokens? {
        guard let raw = try? await webView.evaluateJavaScript("localStorage.getItem('thesarvo.auth')") as? String, let d = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Tokens.self, from: d)
    }

    func reload() { webView.reload() }
    func goBack() { webView.goBack() }

    func setTextScale(_ scale: Double) { webView.pageZoom = scale }

    nonisolated func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        Task { @MainActor in
            switch type {
            case "bootOK": self.onBootOK?()
            case "openMap":
                let guide = body["guide"] as? String
                let pts = (body["points"] as? [[String: Any]] ?? []).enumerated().compactMap { i, d -> CragPoint? in
                    guard let lat = d["lat"] as? Double, let lon = d["lon"] as? Double, let g = guide else { return nil }
                    return CragPoint(id: "page-\(g)-\(i)", guideID: g, title: d["title"] as? String ?? "", subtitle: "", latitude: lat, longitude: lon)
                }
                self.onOpenMap?(guide, pts)
            case "api":
                if let r = BridgeRequest(body), let onAPI = self.onAPI {
                    let answer = await onAPI(r)
                    _ = try? await self.webView.evaluateJavaScript(BridgeAPI.replyScript(id: r.id, status: answer.status, body: answer.body))
                }
            case "openExternal": if let s = body["url"] as? String, let u = URL(string: s) { self.presentExternal?(u) }
            default: break
            }
        }
    }

    nonisolated func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else { return .cancel }
        if url.scheme == AppConfig.originScheme || url.scheme == "about" { return .allow }
        if let host = url.host, host.hasSuffix("thesarvo.com"), url.path.hasPrefix("/g") {
            await MainActor.run { open(path: url.path + (url.query.map { "?" + $0 } ?? "")) }
            return .cancel
        }
        if url.scheme == "http" || url.scheme == "https" || url.scheme == "mailto" || url.scheme == "tel" {
            await MainActor.run { presentExternal?(url) }
        }
        return .cancel
    }

    nonisolated func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { Task { @MainActor in self.presentExternal?(url) } }
        return nil
    }
}

/// `WKUserContentController` retains its handlers, so hand it a weak one.
private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ t: WKScriptMessageHandler) { target = t }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { target?.userContentController(c, didReceive: m) }
}

struct WebHost: UIViewRepresentable {
    let model: WebModel
    func makeUIView(context: Context) -> WKWebView { model.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
