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

        default:
            return addChild( GuideNode(name, value: value, attributes: attributes) )
        }
    }
}

class GuideNode : AEXMLElement
{
    var elementId: String { return attr("id").valueOr("") }
    
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
    
    override var description: String { return value ?? "" }
}

class ClimbNode : GuideNode
{
    var climbName: String { return attr("name").valueOr("").trimmed() }
    var stars: String { return attr("stars").valueOr("").trimmed() }
    var starsPretty: String { return "★" * stars.characters.count }
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

class GpsNode : GuideNode
{
    
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