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
    
    let dataDir: String
    let guideDownloader:GuideDownloader
    
    var lastSyncTry: NSDate?
    let syncInterval = 600.0
    
    init()
    {
        let documentsPath = NSSearchPathForDirectoriesInDomains(.DocumentDirectory, .UserDomainMask, true)[0]
        dataDir = documentsPath.appendPathComponent("guideData")
        try? NSFileManager.defaultManager().createDirectoryAtPath(dataDir, withIntermediateDirectories: true, attributes: nil)
        
        guideDownloader = GuideDownloader(directory: dataDir)

    }
    
    func maybeSync()
    {
        if let lastSyncTry = lastSyncTry
        {
            if lastSyncTry.timeIntervalSinceNow < -syncInterval
            {
                return
            }
        }
        lastSyncTry = NSDate()
        guideDownloader.startSync()
    }
    
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
            self.indexingDone = true
            
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
                    self.index.append( IndexEntry(searchString: guide.name ?? "", node: nil, guide: guide))
                    
                    if let guideElement = guide.guideElement
                    {
                        for child in guideElement.children
                        {
                            if let node = child as? GuideNode
                            {
                                if let ss = node.searchString
                                {
                                    let indexEntry = IndexEntry(searchString: ss, node: node, guide: guide)
                                    node.indexEntry = indexEntry
                                    self.index.append( indexEntry )
                                    
                                    /*
                                    synchronized(self.index)
                                    {
                                        //self.index[ss] = node
                                        index.add
                                    }
*/
                                }
                                
                                if let g = node as? GpsNode
                                {
                                    self.allGpsNodes.append(g)
                                }
                            }
                        }
                    }
                    
                }
            }
            
        }
        NSLog("Finished indexing")
        
    }
    
    func search(searchTerm: String) -> [IndexEntry]
    {
        if (!self.indexingDone)
        {
            return []
        }
        
        return self.index.filter()
        {
            indexEntry in
            return indexEntry.searchString.containsCaseInsensitive(searchTerm)
        }
    }
};