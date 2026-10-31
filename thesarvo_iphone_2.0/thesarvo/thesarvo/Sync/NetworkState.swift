import Foundation
import Network

/// Wi-Fi or cellular, for the "photos on Wi-Fi only" setting. Updated by one path monitor started at launch.
enum NetworkState {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var expensive = false
    nonisolated(unsafe) private static var online = true
    nonisolated(unsafe) private static var monitor: NWPathMonitor?
    nonisolated(unsafe) private static var onChange: (@Sendable (Bool) -> Void)?

    static var isExpensive: Bool {
        lock.lock()
        defer { lock.unlock() }
        return expensive
    }

    static var isOnline: Bool {
        lock.lock()
        defer { lock.unlock() }
        return online
    }

    static func start(onChange handler: @escaping @Sendable (Bool) -> Void) {
        lock.lock()
        defer { lock.unlock() }
        guard monitor == nil else { return }
        onChange = handler
        let m = NWPathMonitor()
        m.pathUpdateHandler = { path in
            lock.lock()
            let was = online
            expensive = path.isExpensive || path.isConstrained
            online = path.status == .satisfied
            let now = online
            let cb = onChange
            lock.unlock()
            if was != now { cb?(now) }
        }
        m.start(queue: DispatchQueue(label: "thesarvo.network"))
        monitor = m
    }
}
