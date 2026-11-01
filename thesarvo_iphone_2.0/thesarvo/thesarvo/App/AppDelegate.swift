import BackgroundTasks
import UIKit

/// The system hooks SwiftUI does not expose: background `URLSession` events and `BGAppRefreshTask`.
final class AppDelegate: NSObject, UIApplicationDelegate {
    static let refreshID = "com.thesarvo.guide.refresh"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        BackgroundDownloader.shared.reconnect()
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.refreshID, using: nil) { task in
            guard let task = task as? BGAppRefreshTask else { return }
            Self.handle(task)
        }
        return true
    }

    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        guard identifier == BackgroundDownloader.identifier else { return completionHandler() }
        BackgroundDownloader.eventsCompletion = completionHandler
        BackgroundDownloader.shared.reconnect()
    }

    /// Asks for a refresh a few hours from now (the system decides when, if at all). Called when the app goes to the background.
    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: refreshID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 6 * 3600)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func handle(_ task: BGAppRefreshTask) {
        schedule()
        let work = Task {
            let ok = await BackgroundRefresh.run()
            task.setTaskCompleted(success: ok)
        }
        task.expirationHandler = { work.cancel() }
    }
}

/// A sync pass with no UI: the same engine, settings and store as the app. A new generation is made current for the next launch
/// (the app, if it is alive in memory, reloads it through the notification).
enum BackgroundRefresh {
    static let didSwitch = Notification.Name("thesarvo.backgroundRefreshSwitched")

    static func run() async -> Bool {
        let store = BlobStore()
        let d = UserDefaults.standard
        let mode = DownloadMode(rawValue: d.string(forKey: "downloadMode") ?? "") ?? .thumbnails
        let policy = Policy(mode: mode)
        let hooks = SyncEngine.Hooks(
            switchTo: { _ in
                store.promoteCandidate()
                var s = store.loadState()
                s.freshSwitch = true
                store.saveState(s)
                await MainActor.run { NotificationCenter.default.post(name: didSwitch, object: nil) }
            },
            refresh: {},
            progress: { _ in }
        )
        do {
            _ = try await SyncEngine(store: store).run(current: store.loadManifest("current") ?? store.loadSeedManifest(), policy: policy, allowCellularImages: false, hooks: hooks)
            return true
        } catch {
            return false
        }
    }
}
