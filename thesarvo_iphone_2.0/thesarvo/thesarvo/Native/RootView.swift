import SwiftUI

struct RootView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView(selection: $app.tab) {
            GuidesView()
                .tabItem { Label("Guides", systemImage: "book") }
                .tag(AppTab.guides)
            MapScreen()
                .tabItem { Label("Map", systemImage: "map") }
                .tag(AppTab.map)
            DownloadsView()
                .tabItem { Label("Downloads", systemImage: "arrow.down.circle") }
                .tag(AppTab.downloads)
            SettingsView(auth: app.auth)
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(AppTab.settings)
        }
        .tint(Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.62, green: 0.68, blue: 1.0, alpha: 1) : UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1) }))
        .fullScreenCover(isPresented: Binding(get: { !app.firstRunDone && app.manifest != nil }, set: { _ in })) { FirstRunView() }
        .sheet(item: $app.external) { SafariView(url: $0).ignoresSafeArea() }
        .onChange(of: scenePhase) { phase in
            if phase == .active { app.sceneActive() }
            if phase == .background { app.sceneBackground() }
        }
        .task { app.start() }
        .overlay(alignment: .top) { NoticeBanner() }
    }
}

struct NoticeBanner: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        if let n = app.notice {
            Text(n)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(.thinMaterial, in: Capsule())
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
                .task(id: n) {
                    try? await Task.sleep(nanoseconds: 3_500_000_000)
                    withAnimation { app.notice = nil }
                }
        }
    }
}

struct GuidesView: View {
    @EnvironmentObject var app: AppModel
    @State private var visibility: NavigationSplitViewVisibility = .automatic
    // Typed as Any? on purpose: `NavigationSplitViewColumn` exists from iOS 17 only.
    @State private var compact: Any?

    var body: some View {
        content
            .navigationSplitViewStyle(.balanced)
            .onChange(of: app.revealPage) { _ in
                if #available(iOS 17, *) { compact = NavigationSplitViewColumn.detail } else { visibility = .detailOnly }
            }
    }

    @ViewBuilder private var content: some View {
        if #available(iOS 17, *) {
            NavigationSplitView(columnVisibility: $visibility, preferredCompactColumn: Binding(get: { (compact as? NavigationSplitViewColumn) ?? .sidebar }, set: { compact = $0 })) {
                MenuView()
            } detail: {
                PageView()
            }
        } else {
            NavigationSplitView(columnVisibility: $visibility) {
                MenuView()
            } detail: {
                PageView()
            }
        }
    }
}

struct PageView: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        ZStack {
            WebHost(model: app.web)
            if app.manifest == nil { EmptyStore() }
        }
        .navigationTitle(app.selection.flatMap { app.byID[$0]?.title } ?? "thesarvo")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                if app.web.canGoBack {
                    Button { app.web.goBack() } label: { Image(systemName: "chevron.backward") }
                        .accessibilityLabel("Back")
                }
                ShareLink(item: shareURL) { Image(systemName: "square.and.arrow.up") }
            }
        }
    }

    private var shareURL: URL {
        URL(string: "https://thesarvo.com" + app.web.path) ?? URL(string: "https://thesarvo.com")!
    }
}

struct EmptyStore: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "icloud.and.arrow.down").font(.system(size: 44)).foregroundStyle(.secondary)
            Text("No guides on this device yet").font(.headline)
            Text(app.online ? "Downloading…" : "Connect to the internet to get them.").foregroundStyle(.secondary)
            if let e = app.syncError { Text(e).font(.footnote).foregroundStyle(.red) }
            Button("Try again") { app.syncNow() }.buttonStyle(.borderedProminent)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
