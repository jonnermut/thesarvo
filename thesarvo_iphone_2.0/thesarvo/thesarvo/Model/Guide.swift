//
//  Guide.swift
//  thesarvo
//
//  Created by Jon Nermut on 2/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation
import MapKit

class GuideDocument : AEXMLDocument
{
    
    
    override func addChild(name name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
    {
        return addChild( GuideElement(name, value: value, attributes: attributes) )
    }
    
}

class GuideElement : AEXMLElement
{
    override func  addChild(name name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
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
    var elementId: String { return attr("id").valueOr("") }
    
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
    
    override var description: String { return value ?? "" }
}

class ClimbNode : GuideNode
{
    var climbName: String { return attr("name").valueOr("").trimmed() }
    var stars: String { return attr("stars").valueOr("").trimmed() }
    var starsPretty: String { return "★" * stars.trimmed().characters.count }
    var grade: String { return attr("grade").valueOr("").trimmed() }
    
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
    override var description: String { return "Intro" }
}

class GpsNode : GuideNode
{
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
        
        return nil
    }
}

public class MapPoint : NSObject, MKAnnotation
{
    
    // Center latitude and longitude of the annotation view.
    // The implementation of this property must be KVO compliant.
    public var coordinate: CLLocationCoordinate2D
    
    // Title and subtitle for use by selection UI.
    public var title: String?
    public var subtitle: String?
    
    var mapObj: GPSMapObject
    
    init(mapObj: GPSMapObject, coordinate: CLLocationCoordinate2D, title: String, subtitle: String)
    {
        self.mapObj = mapObj
        self.coordinate = coordinate
        self.title = title
        self.subtitle = subtitle
    }
}


struct IndexEntry
{
    var searchString : String
    var node : GuideNode?
    var guide : Guide
}



class Guide
{
    let guideId : String
    var name : String?
    
    init(guideId: String)
    {
        self.guideId = guideId
    }
    
    func loadData() -> NSData?
    {
        let downloadedPath = Model.instance.guideDownloader.finalPath("\(guideId).xml")
        let downloadedUrl = NSURL(fileURLWithPath: downloadedPath)
        
        let bundleUrl = NSBundle.mainBundle().URLForResource(guideId, withExtension: "xml", subdirectory: "www/data")
        
        if NSFileManager.defaultManager().fileExistsAtPath(downloadedPath)
        {
            if bundleUrl==nil || downloadedUrl.fileModificationDate?.timeIntervalSince1970 > bundleUrl?.fileModificationDate?.timeIntervalSince1970
            {
                return NSData(contentsOfFile: downloadedPath)
            }
        }
        
        if let url = bundleUrl
        {
            return NSData(contentsOfURL: url)
        }
        return nil
    }
    
    func loadDataAsString() -> String?
    {
        if let d = loadData()
        {
            return String(data: d, encoding: NSUTF8StringEncoding)
        }
        return nil
    }
    
    lazy var guideElement: GuideElement? = self.loadGuideElement()
    
    func loadGuideElement() -> GuideElement?
    {
        if let data = loadData()
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
        let ret = Model.instance.guideDownloader.getUrls(self.guideId)
        return ret
    }
    
    func getHeadings() -> [TextNode]
    {
        var texts = guideElement?.childrenWithName("text") as! [TextNode]
        return texts.filter( { $0.heading } )
    }
    lazy var headings: [TextNode] = self.getHeadings()
    
    func getHeadingsAndClimbs() -> SingleSectionDataSource<GuideNode>
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
            }
        }
        
        return  SingleSectionDataSource(rows: filtered)
        
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