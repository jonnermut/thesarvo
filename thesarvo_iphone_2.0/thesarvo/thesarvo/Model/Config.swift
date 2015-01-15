//
//  Config.swift
//  thesarvo
//
//  Created by Jon Nermut on 2/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation

class ConfigDocument : AEXMLDocument
{
    override func addChild(name: String, value: String, attributes: [NSObject : AnyObject]) -> AEXMLElement
    {
        return addChild( ConfigElement(name, value: value, attributes: attributes) )
    }
    
}

class ConfigElement : AEXMLElement
{
    override func addChild(name: String, value: String, attributes: [NSObject : AnyObject]) -> AEXMLElement
    {
        switch name
        {
        case "view":
            return addChild( View(name, value: value, attributes: attributes) )
        case "listItem":
            return addChild( ListItem(name, value: value, attributes: attributes) )
        default:
            return addChild( ConfigElement(name, value: value, attributes: attributes) )
        }
    }
}

class ListItem : ConfigElement
{
    
    var viewId: String? { return attr("viewId") }
    var text: String?  { return attr("text") }
    var level: Int? { return attr("level")?.toInt() }
    
    var isGuide : Bool
    {
        get
        {
            if let v = viewId
            {
                return  v.startsWith("guide.")
            }
            return false
        }
    }
}

class View : ConfigElement
{
    
    var viewId: String? { return attr("id") }
    var text: String? { return attr("name") }
    var type: String? { return attr("type") }
    
    var listItems : [ListItem]
    {
        return self["data"].childrenWithName("listItem").map( { return $0 as ListItem } )
    }
}

