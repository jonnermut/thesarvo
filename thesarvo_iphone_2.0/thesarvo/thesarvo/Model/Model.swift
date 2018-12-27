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

    var guides: [String: Guide] = [:]
    fileprivate var index: [IndexEntry] = []
    var indexingDone : Bool = false
    
    var allGpsNodes: [GpsNode] = []
    
    let dataDir: String
    let guideDownloader:GuideDownloader
    
    var lastSyncTry: Foundation.Date?
    let syncInterval = 600.0

    var rootGuide: Guide!

    init()
    {
        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        dataDir = documentsPath.appendPathComponent("guideData")
        try? FileManager.default.createDirectory(atPath: dataDir, withIntermediateDirectories: true, attributes: nil)
        
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
        lastSyncTry = Foundation.Date()
        guideDownloader.startSync()
    }


    func getGuide(_ guideId: String, name: String?) -> Guide?
    {
        return guides[guideId]
        //fatalError("FIXME")
        /*
        // lazy init of Guide objects
        return synchronized(self)
        {
            let g = guideId.removePrefixIfPresent("guide.")
            if !self.guides.has(g)
            {
                let ret = Guide(id: g)
                ret.title = name ?? ""
                self.guides[g] = ret
                return ret
            }
            return self.guides[g]!
        }
 */
    }
    
    func load()
    {
        /*
        let path = Bundle.main.path(forResource: "config", ofType: "xml")
        var err: NSError?
        let xmlData = try? Data(contentsOf: Foundation.URL(fileURLWithPath: path!))
        
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
 */
        guard let indexJson = Guide.loadData(name: "index", fileExtension: "json") else
        {
            // bail!
            print("Could not load index.json!")
            return
        }

        let decoder = JSONDecoder()
        rootGuide = try! decoder.decode(Guide.self, from: indexJson)
        if rootGuide == nil
        {
            print("Could not decode index.json!")
            return
        }
        addToGuides(guide: rootGuide)
        
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

    private func addToGuides(guide: Guide)
    {
        let id = guide.viewId ?? "\(guide.id)"
        guides[id] = guide
        for c in guide.children
        {
            addToGuides(guide: c)
        }
    }
    
    func createIndex()
    {
        NSLog("Starting indexing")
        guides.each()
        {
            (key, value) in
            for guide in value.children
            {

                self.index.append( IndexEntry(searchString: guide.title, node: nil, guide: guide))

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
                                g.indexEntry = IndexEntry(searchString: "GPS", node: g, guide: guide)
                                self.allGpsNodes.append(g)
                            }
                        }
                    }
                }
            }
        }
        NSLog("Finished indexing")
        
    }
    
    func search(_ searchTerm: String) -> [IndexEntry]
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

    var showClimbsInTOC: Bool
    {
        get {
            if UserDefaults.standard.object(forKey: "showClimbsInTOC") == nil
            {
                return true // default is true, not false
            }
            return UserDefaults.standard.bool(forKey: "showClimbsInTOC")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "showClimbsInTOC")
        }
    }
};
