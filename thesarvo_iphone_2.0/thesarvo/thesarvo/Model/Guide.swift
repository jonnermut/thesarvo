//
//  Guide.swift
//  thesarvo
//
//  Created by Jon Nermut on 2/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation

class GuideDocument : AEXMLDocument
{
    override func addChild(name: String, value: String, attributes: [NSObject : AnyObject]) -> AEXMLElement
    {
        return addChild( GuideElement(name, value: value, attributes: attributes) )
    }
    
}

class GuideElement : AEXMLElement
{
    override func addChild(name: String, value: String, attributes: [NSObject : AnyObject]) -> AEXMLElement
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

        default:
            return addChild( GuideNode(name, value: value, attributes: attributes) )
        }
    }
}

class GuideNode : AEXMLElement
{
    var elementId: String? { return attr("id") }
    
    var searchString : String? { return nil }
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
}

class ClimbNode : GuideNode
{
    var climbName: String? { return attr("name") }
    var stars: String? { return attr("stars")?.trimmed() }
    var grade: String? { return attr("grade") }
    
    override var searchString : String?
    {
        return "\(stars?) \(grade) \(climbName)"
    }
}

class ImageNode : GuideNode
{
    
}

class GpsNode : GuideNode
{
    
}

struct IndexEntry
{
    var searchString : String
    var node : GuideNode
}



class Guide
{
    let guideId : String
    
    init(guideId: String)
    {
        self.guideId = guideId
    }
    
    func loadData() -> NSData?
    {
        if let url = NSBundle.mainBundle().URLForResource(guideId, withExtension: "xml", subdirectory: "www/data")
        {
            return NSData(contentsOfURL: url)
        }
        return nil
    }
    
    func loadDataAsString() -> String?
    {
        if let d = loadData()
        {
            let newStr = NSString(data: d, encoding: NSUTF8StringEncoding)
            return newStr
        }
        return nil
    }
    
    lazy var guideElement: GuideElement? = self.loadGuideElement()
    
    func loadGuideElement() -> GuideElement?
    {
        if let data = loadData()
        {
            // parse the guide...
            var err: NSError?
            if let doc = GuideDocument(xmlData: data, error: &err)
            {
                return doc["guide"] as? GuideElement
            }
        }
        return nil
    }
    
    
    
    func getHeadings() -> [TextNode]
    {
        var texts = guideElement?.childrenWithName("text") as [TextNode]
        return texts.filter( { $0.heading } )
    }
    lazy var headings: [TextNode] = self.getHeadings()
    

}