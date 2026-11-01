import MapKit
import SwiftUI

/// The crags map: MapKit wrapped in a `UIViewRepresentable` (SwiftUI's own `Map` with annotations needs iOS 17).
struct MapScreen: View {
    @EnvironmentObject var app: AppModel
    @State private var points: [CragPoint] = []
    @State private var loadedFor = ""

    var body: some View {
        NavigationStack {
            CragMap(points: shown, focus: app.mapFocus) { guide in app.openGuide(id: guide) }
                .navigationTitle(focusTitle)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if app.mapFocus != nil {
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

    private var focusTitle: String {
        if let f = app.mapFocus, let n = app.byID[f] { return n.title }
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
    var subtitle: String? { point.subtitle }
    init(_ p: CragPoint) { point = p }
}

struct CragMap: UIViewRepresentable {
    let points: [CragPoint]
    let focus: String?
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
            return v
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
            if let a = view.annotation as? CragAnnotation { parent.openGuide(a.point.guideID) }
        }
    }
}
