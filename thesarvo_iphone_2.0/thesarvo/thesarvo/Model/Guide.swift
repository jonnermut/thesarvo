//
//  Guide.swift
//  thesarvo
//
//  Created by Jon Nermut on 2/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation
import MapKit
fileprivate func < <T : Comparable>(lhs: T?, rhs: T?) -> Bool {
  switch (lhs, rhs) {
  case let (l?, r?):
    return l < r
  case (nil, _?):
    return true
  default:
    return false
  }
}

fileprivate func > <T : Comparable>(lhs: T?, rhs: T?) -> Bool {
  switch (lhs, rhs) {
  case let (l?, r?):
    return l > r
  default:
    return rhs < lhs
  }
}


class GuideDocument : AEXMLDocument
{
    
    
    override func addChild(name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
    {
        return addChild( GuideElement(name, value: value, attributes: attributes) )
    }
    
}

class GuideElement : AEXMLElement
{
    override func  addChild(name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
    {
        switch name
        {
        case "text":
            return addChild( TextNode(name, value: value, attributes: attributes) )
        case "climb", "problem":
            return addChild( ClimbNode(name, value: value, attributes: attributes) )
        case "image":
            return addChild( ImageNode(name, value: value, attributes: attributes) )
        case "gps":
            return addChild( GpsNode(name, value: value, attributes: attributes) )
        case "header":
            return addChild( HeaderNode(name, value: value, attributes: attributes) )

            
        default:
            return addChild( GuideNode(name, value: value, attributes: attributes) )
        }
    }
}

class GuideNode : AEXMLElement
{
    var elementId: String { return attr("id") ?? "" }
    
    var searchString : String? { return nil }
    
    var indexEntry: IndexEntry?
}

class TextNode : GuideNode
{
    var clazz: String? { return attr("class") }
    
    var heading : Bool
    {
        if let c = clazz
        {
            return c.startsWith("heading")
        }
        return false
    }
    
    override var searchString : String?
    {
        if heading
        {
            return value
        }
        return nil
    }
    
    override var description: String { return value?.replacingOccurrences(of: "<br/>", with: "\n") ?? "" }
}

class ClimbNode : GuideNode
{
    var climbName: String { return (attr("name") ?? "").trimmed() }
    var stars: String { return (attr("stars") ?? "").trimmed() }
    var starsPretty: String { return "★" * stars.trimmed().characters.count }
    var grade: String { return (attr("grade") ?? "").trimmed() }
    
    override var searchString : String?
    {
        return "\(stars) \(grade) \(climbName)"
    }
    
    override var description: String { return "\(starsPretty) \(climbName) \(grade)" }
}

class ImageNode : GuideNode
{
    
}

class HeaderNode : GuideNode
{
    override var description: String { return "Introduction" }
}

class GpsNode : GuideNode
{
    override var description: String { return "Map" }
    var gpsObjects: [GPSMapObject]
    {
        return self.children.map()
        {
            element in
            return GPSMapObject(element: element, gpsNode: self)
        }
    }
}

class GPSMapObject
{
    let element: AEXMLElement
    let gpsNode: GpsNode
    
    var type: String
    {
        return element.name
    }
    
    var latitude: Double
    {
        return Double( element.attributes["latitude"] ?? "0.0") ?? 0.0
    }

    var longitude: Double
    {
        return Double( element.attributes["longitude"] ?? "0.0") ?? 0.0
    }
    
    var description: String
    {
        return element.attributes["description"] ?? ""
    }
    
    var code: String
    {
        return element.attributes["code"] ?? ""
    }
    
    init(element: AEXMLElement, gpsNode: GpsNode)
    {
        self.element = element
        self.gpsNode = gpsNode
    }
    
    func getMKAnnotation() -> MKAnnotation?
    {
        if type == "point" && latitude != 0.0 && longitude != 0.0 
        {
            let loc = CLLocationCoordinate2DMake(latitude, longitude)
            let title = "\(description)"
            var c = code
            if c.characters.count != 0
            {
                c = c + ": "
            }
            let subtitle = "\(c)\(latitude),\(longitude)"
            return MapPoint(mapObj: self, coordinate: loc, title: title, subtitle: subtitle)
        }
        else if type == "polyline"
        {
            var points: [CLLocationCoordinate2D] = []
            
            // parse the format: -42.538533,147.285656 -42.538529,147.285646 -42.538476,147.285542 -42.538422,147.285439
            if let coordStrs = self.element.value?.components(separatedBy: " ")
            {
                for coordStr in coordStrs
                {
                    let c2 = coordStr.trimmed()
                    let latlng = c2.components(separatedBy: ",")
                    if (latlng.count >= 2)
                    {
                        let lng = Double(latlng[1])
                        let lat = Double(latlng[0])
                        if let lng=lng, let lat=lat
                        {
                            points.append(CLLocationCoordinate2D(latitude: lat, longitude: lng))
                        }
                    }
                }
            }
            
            return MKPolyline(coordinates: &points, count: points.count)
            
        }

        
        return nil
    }
}

open class MapPoint : NSObject, MKAnnotation
{
    
    // Center latitude and longitude of the annotation view.
    // The implementation of this property must be KVO compliant.
    open var coordinate: CLLocationCoordinate2D
    
    // Title and subtitle for use by selection UI.
    open var title: String?
    open var subtitle: String?
    
    var mapObj: GPSMapObject
    
    init(mapObj: GPSMapObject, coordinate: CLLocationCoordinate2D, title: String, subtitle: String)
    {
        self.mapObj = mapObj
        self.coordinate = coordinate
        self.title = title
        self.subtitle = subtitle
    }
}


    
public struct IndexEntry
{
    var searchString : String
    var node : GuideNode?
    
    #if os(iOS)
    var guide : Guide
    #endif
}

#if os(iOS)

public class Guide: Codable
{
    let id : Int64
    var title : String = ""
    var children: Array<Guide> = []

    var viewId: String? = nil
    var level: Int? = 1
    var url : String? = nil
    
    init(id: Int64)
    {
        self.id = id
    }

    init(viewId: String, title: String, children: Array<Guide> = [])
    {
        self.id = -1
        self.title = title
        self.viewId = viewId
        self.children = children
    }

    lazy var data: Data? =
    {
        return self.loadData()
    }()
    
    func loadData() -> Data?
    {
        return Guide.loadData(name:"\(id)", fileExtension: "xml")
    }

    public var isGuide: Bool
    {
        return viewId == nil
    }

    public var hasChildren: Bool
    {
        return self.children.count > 0
    }

    public var hasGuideContent: Bool
    {
        return self.data != nil
    }

    public static func loadData(name: String, fileExtension: String) -> Data?
    {
        let downloadedPath = Model.instance.guideDownloader.finalPath("\(name).\(fileExtension)")
        let downloadedUrl = Foundation.URL(fileURLWithPath: downloadedPath)

        let bundleUrl = Bundle.main.url(forResource: name, withExtension: fileExtension, subdirectory: "www/data")

        if FileManager.default.fileExists(atPath: downloadedPath)
        {
            if bundleUrl==nil || downloadedUrl.fileModificationDate?.timeIntervalSince1970 > bundleUrl?.fileModificationDate?.timeIntervalSince1970
            {
                return (try? Data(contentsOf: Foundation.URL(fileURLWithPath: downloadedPath)))
            }
        }

        if let url = bundleUrl
        {
            return (try? Data(contentsOf: url))
        }
        return nil
    }


    func loadDataAsString() -> String?
    {
        if let d = data
        {
            return String(data: d, encoding: String.Encoding.utf8)
        }
        return nil
    }
    
    lazy var guideElement: GuideElement? = self.loadGuideElement()
    
    func loadGuideElement() -> GuideElement?
    {
        if let data = self.data
        {
            // parse the guide...
            if let doc = try? GuideDocument(xmlData: data)
            {
                return doc["guide"] as? GuideElement
            }
        }
        return nil
    }
    
    func getImageUrls() -> Dictionary<String, String>
    {
        let ret = Model.instance.guideDownloader.getUrls("\(self.id)")
        return ret
    }
    
    func getHeadings() -> [TextNode]
    {
        let texts = guideElement?.childrenWithName("text") as! [TextNode]
        return texts.filter( { $0.heading } )
    }
    lazy var headings: [TextNode] = self.getHeadings()
    
    func getHeadingsAndClimbs() -> Array<GuideNode>
    {
        var filtered = Array<GuideNode>()
        if let kids = guideElement?.children
        {
            for node in kids
            {
                if let text = node as? TextNode
                {
                    if text.heading
                    {
                        filtered.append(text)
                    }
                }
                else if let climb = node as? ClimbNode
                {
                    filtered.append(climb)
                }
                else if let header = node as? HeaderNode
                {
                    filtered.append(header)
                }
                else if let header = node as? GpsNode
                {
                    filtered.append(header)
                }
            }
        }
        
        return filtered
        
        /*
        var current = Section<GuideNode>(header: name.valueOr("") )
        if let kids = guideElement?.children
        {
            for node in kids
            {
                if let text = node as? TextNode
                {
                    if text.heading
                    {
                        if current.rows.count > 0
                        {
                            d.sections.append(current)
                        }
                        current = Section<GuideNode>(header: text.value ?? "")
                    }
                }
                else if let climb = node as? ClimbNode
                {
                    current.rows.append(climb)
                }
            }
            if current.rows.count > 0
            {
                d.sections.append(current)
            }
        }
        return d*/
    }
    

}

#endif
