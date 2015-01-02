//
//  Model.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation

class ListItem
{
    init( elem: AEXMLElement)
    {
        viewId = elem.attr("viewId")
        name = elem.attr("text")
        var l = elem.attr("level")?.toInt()
        if let l = l
        {
            level = l
        }
    }
    
    var viewId: String?
    var name: String?
    var level: Int = 0
}

class View
{
    init( elem: AEXMLElement)
    {
        viewId = elem.attr("id")
        name = elem.attr("name")
        type = elem.attr("type")
        
        for li in elem["data"].childrenWithName("listItem")
        {
            listItems.append( ListItem(elem: li) )
        }
    }
    
    var viewId: String?
    var name: String?
    var type: String?
    
    var listItems : [ListItem] = []
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
    

}

class Model
{
    class var instance : Model
    {
        struct Static {
            static let instance : Model = Model()
        }
        return Static.instance
    }
    
    var views: [String: View] = [:]
    
    func load()
    {
        var path = NSBundle.mainBundle().pathForResource("config", ofType: "xml")
        var err: NSError?
        var xmlData = NSData(contentsOfFile: path!)
        
        if let xmlDoc = AEXMLDocument(xmlData: xmlData!, error: &err)
        {
            for elem in xmlDoc["config"].childrenWithName("view")
            {
                var v = View(elem: elem)
                views[v.viewId!] = v
            }
        }

        
        runInBackground() {
            
            self.createIndex()
            
            runOnMain() {
                // update some UI
            }
        }
    }
    
    var rootView : View?
    {
        get {
            return views["home"]
        }
    }
    
    func createIndex()
    {
        
    }
}