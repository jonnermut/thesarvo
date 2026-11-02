import SwiftUI

/// The app's accent: navy in light mode, a light periwinkle in dark.
let brandTint = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.62, green: 0.68, blue: 1.0, alpha: 1) : UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1) })

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
        .tint(brandTint)
        .fullScreenCover(isPresented: Binding(get: { !app.firstRunDone && app.manifest != nil }, set: { _ in })) { FirstRunView().tint(brandTint) }
        .sheet(item: $app.sharedFile) { ActivityView(url: $0.url).ignoresSafeArea() }
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
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        Group {
            if sizeClass == .regular {
                // iPad: the menu stays beside the page.
                NavigationSplitView { MenuView() } detail: { NavigationStack { PageView(showMenuButton: false) } }
                    .navigationSplitViewStyle(.balanced)
            } else {
                // iPhone: the page fills the screen; the menu is a sheet from the hamburger button.
                NavigationStack { PageView(showMenuButton: true) }
                    .sheet(isPresented: $app.showMenu) { NavigationStack { MenuView() } }
            }
        }
        .sheet(item: $app.contents) { ContentsList(sheet: $0).tint(brandTint) }
    }
}

struct PageView: View {
    @EnvironmentObject var app: AppModel
    let showMenuButton: Bool

    var body: some View {
        ZStack {
            WebHost(model: app.web)
            if app.manifest == nil { EmptyStore() }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(title).font(.headline).lineLimit(1).minimumScaleFactor(0.8)
            }
            ToolbarItemGroup(placement: .navigationBarLeading) {
                if showMenuButton {
                    Button { app.openMenu() } label: { Image(systemName: "line.3.horizontal") }
                        .accessibilityLabel("Menu")
                }
                if app.web.canGoBack {
                    Button { app.web.goBack() } label: { Image(systemName: "chevron.backward") }
                        .accessibilityLabel("Back")
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    ShareLink(item: shareURL) { Label("Share", systemImage: "square.and.arrow.up") }
                    if app.canEditPage {
                        Button { app.toggleEdit() } label: { Label(app.isEditing ? "Stop editing" : "Edit this guide", systemImage: app.isEditing ? "eye" : "pencil") }
                    }
                } label: { Image(systemName: "ellipsis.circle") }
                .accessibilityLabel("Page options")
            }
        }
    }

    private var title: String { app.selection.flatMap { app.byID[$0]?.title } ?? "thesarvo" }

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

/// The system share sheet for one file (AirDrop, Files, Gaia GPS, Organic Maps and other apps that open it).
struct ActivityView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: [url], applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
