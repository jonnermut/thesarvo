import MapKit
import SwiftUI

/// The crags map: MapKit wrapped in a `UIViewRepresentable` (SwiftUI's own `Map` with annotations needs iOS 17).
struct MapScreen: View {
    @EnvironmentObject var app: AppModel
    @State private var points: [CragPoint] = []
    @State private var loadedFor = ""
    /// 0 standard, 1 satellite, 2 hybrid (satellite with names): hybrid until the reader chooses.
    @AppStorage("mapType") private var mapStyle = 2

    var body: some View {
        NavigationStack {
            CragMap(points: shown, focus: focus, style: mapStyle, areas: { app.areaNames(for: $0) }) { guide in app.openGuide(id: guide) }
                .navigationTitle(focusTitle)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Picker("Map type", selection: $mapStyle) {
                            Text("Standard").tag(0)
                            Text("Satellite").tag(1)
                            Text("Hybrid").tag(2)
                        }
                        .pickerStyle(.menu)
                    }
                    if focus != nil {
                        ToolbarItem(placement: .navigationBarTrailing) { Button("All crags") { app.mapFocus = nil } }
                    }
                }
        }
        .task(id: app.manifest?.builtAt) { await load() }
    }

    private var shown: [CragPoint] {
        guard let g = app.pagePoints.first?.guideID else { return points }
        return points.filter { $0.guideID != g } + app.pagePoints
    }

    /// The guide being looked at, once it is known to have points (a page without any shows every crag).
    private var focus: String? {
        guard let f = app.mapFocus, app.byID[f]?.isGuide == true else { return nil }
        return points.isEmpty || shown.contains { $0.guideID == f } ? f : nil
    }

    private var focusTitle: String {
        if let f = focus, let n = app.byID[f] { return n.title }
        return "Map"
    }

    private func load() async {
        let stamp = app.manifest?.builtAt ?? ""
        guard stamp != loadedFor || points.isEmpty else { return }
        let items: [(String, Data)] = app.kmlPaths().compactMap { p in
            guard let d = app.readData(p) else { return nil }
            let id = (p as NSString).lastPathComponent.replacingOccurrences(of: ".kml", with: "")
            return (id, d)
        }
        let all = await Task.detached { items.flatMap { KMLPoints.parse($0.1, guideID: $0.0) } }.value
        points = all
        loadedFor = stamp
    }
}

final class CragAnnotation: NSObject, MKAnnotation {
    let point: CragPoint
    var coordinate: CLLocationCoordinate2D { point.coordinate }
    var title: String? { point.title }
    /// The guide or folder, then the coordinates (the old app showed them in the callout).
    var subtitle: String? { [point.subtitle, String(format: "%.5f, %.5f", point.latitude, point.longitude)].filter { !$0.isEmpty }.joined(separator: " · ") }
    init(_ p: CragPoint) { point = p }
}

struct CragMap: UIViewRepresentable {
    let points: [CragPoint]
    let focus: String?
    let style: Int
    /// A guide's area names, widest first (region, then sub-area), for naming clusters.
    let areas: (String) -> [String]
    let openGuide: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView()
        map.delegate = context.coordinator
        map.showsUserLocation = true
        map.showsCompass = true
        let locate = MKUserTrackingButton(mapView: map)
        locate.translatesAutoresizingMaskIntoConstraints = false
        locate.backgroundColor = .systemBackground.withAlphaComponent(0.9)
        locate.layer.cornerRadius = 8
        map.addSubview(locate)
        NSLayoutConstraint.activate([
            locate.trailingAnchor.constraint(equalTo: map.safeAreaLayoutGuide.trailingAnchor, constant: -12),
            locate.bottomAnchor.constraint(equalTo: map.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
        map.register(MKMarkerAnnotationView.self, forAnnotationViewWithReuseIdentifier: "crag")
        map.register(MKMarkerAnnotationView.self, forAnnotationViewWithReuseIdentifier: MKMapViewDefaultClusterAnnotationViewReuseIdentifier)
        map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: -42.1, longitude: 146.6), span: MKCoordinateSpan(latitudeDelta: 5.2, longitudeDelta: 4.5)), animated: false)
        context.coordinator.locationManager.requestWhenInUseAuthorization()
        return map
    }

    func updateUIView(_ map: MKMapView, context: Context) {
        context.coordinator.parent = self
        let type: MKMapType = style == 1 ? .satellite : style == 2 ? .hybrid : .standard
        if map.mapType != type { map.mapType = type }
        let key = "\(points.count)-\(points.last?.id ?? "")"
        if context.coordinator.loadedKey != key {
            map.removeAnnotations(map.annotations.filter { $0 is CragAnnotation })
            map.addAnnotations(points.map(CragAnnotation.init))
            context.coordinator.loadedKey = key
        }
        if context.coordinator.focused != focus {
            context.coordinator.focused = focus
            if let focus {
                let mine = points.filter { $0.guideID == focus }
                if !mine.isEmpty {
                    // At least about a kilometre across, so one point does not zoom past the tiles.
                    let rect = mine.reduce(MKMapRect.null) { r, p in
                        let pt = MKMapPoint(p.coordinate)
                        let side = MKMapPointsPerMeterAtLatitude(p.coordinate.latitude) * 800
                        return r.union(MKMapRect(x: pt.x - side, y: pt.y - side, width: side * 2, height: side * 2))
                    }
                    map.setVisibleMapRect(rect, edgePadding: UIEdgeInsets(top: 80, left: 60, bottom: 100, right: 60), animated: true)
                }
            } else if map.annotations.count > 1 {
                map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: -42.1, longitude: 146.6), span: MKCoordinateSpan(latitudeDelta: 5.2, longitudeDelta: 4.5)), animated: true)
            }
        }
    }

    final class Coordinator: NSObject, MKMapViewDelegate {
        var parent: CragMap
        var loadedKey = ""
        var focused: String?
        let locationManager = CLLocationManager()
        var zoomedOut = true
        init(_ p: CragMap) { parent = p }

        private func context(_ map: MKMapView) -> Bool { map.region.span.latitudeDelta > 0.06 }

        /// Crossing the zoom threshold re-adds the pins, so MapKit re-evaluates which of them cluster.
        func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            let out = context(mapView)
            guard out != zoomedOut else { return }
            zoomedOut = out
            let pins = mapView.annotations.filter { $0 is CragAnnotation }
            mapView.removeAnnotations(pins)
            mapView.addAnnotations(pins)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let a = annotation as? CragAnnotation else { return nil }
            let v = mapView.dequeueReusableAnnotationView(withIdentifier: "crag", for: a) as? MKMarkerAnnotationView
            // Clusters only while zoomed out: close in, every crag shows on its own.
            v?.clusteringIdentifier = context(mapView) ? "crag" : nil
            v?.canShowCallout = true
            v?.markerTintColor = UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1)
            v?.glyphImage = UIImage(systemName: "mountain.2.fill")
            v?.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
            let go = UIButton(type: .system)
            go.setImage(UIImage(systemName: "car.fill"), for: .normal)
            go.accessibilityLabel = "Directions"
            go.frame = CGRect(x: 0, y: 0, width: 36, height: 36)
            v?.leftCalloutAccessoryView = go
            return v
        }

        /// A cluster is named for the area its crags share (not for one of its crags), with how many there are.
        func mapView(_ mapView: MKMapView, clusterAnnotationForMemberAnnotations members: [MKAnnotation]) -> MKClusterAnnotation {
            let cluster = MKClusterAnnotation(memberAnnotations: members)
            cluster.title = ClusterName.label(for: members.compactMap { ($0 as? CragAnnotation).map { parent.areas($0.point.guideID) } })
            cluster.subtitle = "\(members.count) points"
            return cluster
        }

        /// Tapping a cluster zooms to fit its crags instead of just selecting it.
        func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
            guard let cluster = view.annotation as? MKClusterAnnotation else { return }
            mapView.deselectAnnotation(cluster, animated: false)
            let rect = cluster.memberAnnotations.reduce(MKMapRect.null) { r, a in
                let pt = MKMapPoint(a.coordinate)
                return r.union(MKMapRect(x: pt.x, y: pt.y, width: 0.1, height: 0.1))
            }
            mapView.setVisibleMapRect(rect, edgePadding: UIEdgeInsets(top: 80, left: 50, bottom: 80, right: 50), animated: true)
        }

        func mapView(_ mapView: MKMapView, annotationView view: MKAnnotationView, calloutAccessoryControlTapped control: UIControl) {
            guard let a = view.annotation as? CragAnnotation else { return }
            if control === view.leftCalloutAccessoryView { chooseDirections(for: a.point); return }
            parent.openGuide(a.point.guideID)
        }

        /// Asks which app to navigate with, then opens it at the point.
        private func chooseDirections(for p: CragPoint) {
            let sheet = UIAlertController(title: "Directions to \(p.title)", message: nil, preferredStyle: .actionSheet)
            for t in DirectionsTarget.all(latitude: p.latitude, longitude: p.longitude, title: p.title) {
                sheet.addAction(UIAlertAction(title: t.name, style: .default) { _ in UIApplication.shared.open(t.url) })
            }
            sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            let top = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController
            var presenter = top
            while let next = presenter?.presentedViewController { presenter = next }
            sheet.popoverPresentationController?.sourceView = presenter?.view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: presenter?.view.bounds.midX ?? 0, y: presenter?.view.bounds.midY ?? 0, width: 1, height: 1)
            presenter?.present(sheet, animated: true)
        }
    }
}

enum ClusterName {
    /// The deepest area all the chains share, else the most common widest area; nil when none are known.
    static func label(for chains: [[String]]) -> String? {
        let chains = chains.filter { !$0.isEmpty }
        guard var common = chains.first else { return nil }
        for c in chains.dropFirst() { common = Array(zip(common, c).prefix { $0 == $1 }.map(\.0)) }
        if let last = common.last { return last }
        let counts = Dictionary(grouping: chains.map { $0[0] }, by: { $0 }).mapValues(\.count)
        return counts.max { ($0.value, $1.key) < ($1.value, $0.key) }?.key
    }
}
