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

    var onOpenMap: ((String?) -> Void)?
    var onBootOK: (() -> Void)?
    var onNavigated: ((String) -> Void)?
    var presentExternal: ((URL) -> Void)?

    private var observers: [NSKeyValueObservation] = []

    /// Hides the website's own header, side tree and footer (the app has a native menu), and tells the page it runs in the app.
    private static let appModeScript = """
    (function () {
      window.thesarvoApp = { bridge: \(AppConfig.bridgeVersion), platform: 'ios' };
      document.documentElement.setAttribute('data-app', 'ios');
      var css = 'header[data-bar], aside.side-nav, body > div > div > button[aria-label="Close navigation"], footer { display: none !important; } '
        + 'html { -webkit-text-size-adjust: 100%; } .no-print.sticky { top: 0 !important; }';
      var s = document.createElement('style'); s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
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

    func reload() { webView.reload() }
    func goBack() { webView.goBack() }

    func setTextScale(_ scale: Double) { webView.pageZoom = scale }

    nonisolated func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        Task { @MainActor in
            switch type {
            case "bootOK": self.onBootOK?()
            case "openMap": self.onOpenMap?(body["guide"] as? String)
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
