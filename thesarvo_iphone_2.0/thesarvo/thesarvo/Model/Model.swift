//
//  Model.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation

class Model
{
    class var instance : Model
    {
        struct Static
        {
            static let instance : Model = Model()
        }
        return Static.instance
    }
    
    var views: [String: View] = [:]
    private var index: [IndexEntry] = []
    var indexingDone : Bool = false
    
    private var guides: [String: Guide] = [:]
    
    var allGpsNodes: [GpsNode] = []
    
    func getGuide(guideId: String, name: String?) -> Guide
    {
        // lazy init of Guide objects
        return synchronized(self)
        {
            let g = guideId.removePrefixIfPresent("guide.")
            if !self.guides.has(g)
            {
                let ret = Guide(guideId: g)
                ret.name = name
                self.guides[g] = ret
                return ret
            }
            return self.guides[g]!
        }
    }
    
    func load()
    {
        let path = NSBundle.mainBundle().pathForResource("config", ofType: "xml")
        var err: NSError?
        let xmlData = NSData(contentsOfFile: path!)
        
        if let xmlDoc = try? ConfigDocument(xmlData: xmlData!)
        {
            for elem in xmlDoc["config"].childrenWithName("view")
            {
                if let v = elem as? View
                {
                    views[v.viewId!] = v
                }
            }
        }
        
        runInBackground()
        {
            self.createIndex()
            
            runOnMain()
            {
                // update some UI
            }
        }
    }
    
    var rootView : View? { return views["home"] }

    
    func createIndex()
    {
        NSLog("Starting indexing")
        views.each()
        {
            (key, value) in
            for li in value.listItems
            {
                if li.isGuide
                {
                    let guide = self.getGuide(li.viewId!,name: li.text)
                    if let guideElement = guide.guideElement
                    {
                        for child in guideElement.children
                        {
                            if let node = child as? GuideNode
                            {
                                if let ss = node.searchString
                                {
                                    self.index.append( IndexEntry(searchString: ss, node: node) )
                                    
                                    /*
                                    synchronized(self.index)
                                    {
                                        //self.index[ss] = node
                                        index.add
                                    }
*/
                                }
                            }
                        }
                    }
                    
                }
            }
            
        }
        NSLog("Finished indexing")
        
    }
    
};