import CoreLocation
import Foundation

struct CragPoint: Identifiable, Hashable {
    let id: String
    let guideID: String
    let title: String
    let subtitle: String
    let latitude: Double
    let longitude: Double

    var coordinate: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: latitude, longitude: longitude) }
}

/// Reads the crag points from a guide's KML (`g-data/kml/<guide id>.kml`): Placemarks with Point coordinates, inside optional Folders.
final class KMLPoints: NSObject, XMLParserDelegate {
    private let guideID: String
    private var stack: [String] = []
    private var text = ""
    private var folders: [String] = []
    private var docName = ""
    private var placemarkName = ""
    private var inPlacemark = false
    private(set) var points: [CragPoint] = []

    init(guideID: String) { self.guideID = guideID }

    static func parse(_ data: Data, guideID: String) -> [CragPoint] {
        let k = KMLPoints(guideID: guideID)
        let p = XMLParser(data: data)
        p.delegate = k
        p.parse()
        return k.points
    }

    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        stack.append(name)
        text = ""
        if name == "Placemark" { inPlacemark = true; placemarkName = "" }
        if name == "Folder" { folders.append("") }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) { text += string }

    func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let parent = stack.dropLast().last
        switch name {
        case "name":
            if inPlacemark { placemarkName = t } else if parent == "Folder" { folders[folders.count - 1] = t } else if parent == "Document" { docName = t }
        case "coordinates":
            guard inPlacemark else { break }
            let parts = t.split(separator: ",").compactMap { Double($0) }
            if parts.count >= 2 {
                points.append(CragPoint(id: "\(guideID)-\(points.count)", guideID: guideID, title: placemarkName, subtitle: folders.last(where: { !$0.isEmpty }) ?? docName, latitude: parts[1], longitude: parts[0]))
            }
        case "Placemark": inPlacemark = false
        case "Folder": _ = folders.popLast()
        default: break
        }
        _ = stack.popLast()
        text = ""
    }
}
