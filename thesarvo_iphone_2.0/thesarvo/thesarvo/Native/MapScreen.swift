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
                .ignoresSafeArea(edges: .bottom)
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
        init(_ p: CragMap) { parent = p }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let a = annotation as? CragAnnotation else { return nil }
            let v = mapView.dequeueReusableAnnotationView(withIdentifier: "crag", for: a) as? MKMarkerAnnotationView
            v?.clusteringIdentifier = "crag"
            v?.canShowCallout = true
            v?.markerTintColor = UIColor(red: 0.106, green: 0.078, blue: 0.392, alpha: 1)
            v?.glyphImage = UIImage(systemName: "mountain.2.fill")
            v?.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
            return v
        }

        func mapView(_ mapView: MKMapView, annotationView view: MKAnnotationView, calloutAccessoryControlTapped control: UIControl) {
            if let a = view.annotation as? CragAnnotation { parent.openGuide(a.point.guideID) }
        }
    }
}
