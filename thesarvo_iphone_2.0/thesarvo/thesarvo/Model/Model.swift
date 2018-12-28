//
//  Model.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation

public let excludePages: Array<Int64> = [11370498, // Buy and download guides
13467650, // Hardcopy Guides
14450710, // Guide Manual
330433081, // The Rookeries
1147, //Additional Topos and Maps
1148, // Articles
1516, // Mt Wellington Guide Feedback
2883716, // Mt Wellington Updates
276267033, // Pipes Guide To Do
9404496, // GPS
]

public let weather = [
    Guide(viewId: "http://m.bom.gov.au/tas/hobart/radar/", title: "Radar"),
    Guide(viewId: "http://www.bom.gov.au/tas/observations/tasall.shtml", title: "Observations"),
    Guide(viewId: "http://www.bom.gov.au/fwo/IDG00073.pdf", title: "Synoptic Forecast"),
    Guide(viewId: "http://satview.bom.gov.au/", title: "Satellite"),

    Guide(viewId: "http://m.bom.gov.au/tas/ben-lomond/", title: "Ben Lomond"),
    Guide(viewId: "http://m.bom.gov.au/tas/buckland/", title: "Buckland (Sand River)"),
    Guide(viewId: "http://m.bom.gov.au/tas/burnie/", title: "Burnie"),
    Guide(viewId: "http://m.bom.gov.au/tas/coles-bay/", title: "Coles Bay (Freycinet)"),
    Guide(viewId: "http://m.bom.gov.au/tas/cradle-mountain/", title: "Cradle Mountain"),
    Guide(viewId: "http://m.bom.gov.au/tas/hillwood/", title: "Hillwood"),
    Guide(viewId: "http://m.bom.gov.au/tas/hobart/", title: "Hobart"),
    Guide(viewId: "http://m.bom.gov.au/tas/lake-st-clair/", title: "Lake St Clair"),
    Guide(viewId: "http://m.bom.gov.au/tas/launceston/", title: "Launceston"),
    Guide(viewId: "http://m.bom.gov.au/tas/kunanyi-mount-wellington/", title: "Mt Wellington Summit"),
    Guide(viewId: "http://m.bom.gov.au/tas/new-norfolk/", title: "New Norfolk"),
    Guide(viewId: "http://m.bom.gov.au/tas/oatlands/", title: "Oatlands"),
    Guide(viewId: "http://m.bom.gov.au/tas/port-arthur/", title: "Port Arthur (Tasman Peninsula)"),
    Guide(viewId: "http://m.bom.gov.au/tas/strathgordon/", title: "Strathgordon (South West)"),
]


public let extraViews = [
    Guide(viewId: "Map", title: "Map"),
    Guide(viewId: "Weather", title: "Weather", children: weather),
    Guide(viewId: "http://www.thesarvo.com/confluence/display/thesarvo/Tasmania", title: "thesarvo.com"),
]


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
        rootGuide.children.append(contentsOf: extraViews)
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

        if guide.title.hasSuffix(" bouldering")
        {
            guide.title.removeLast(" bouldering".count)
        }
        if guide.title == "The Tasmanian Bouldering Guide"
        {
            guide.title = "Bouldering"
        }

        guide.children = guide.children.filter {
            !excludePages.contains($0.id)
            && !$0.title.containsCaseInsensitive("Gallery")
        }

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
            return UserDefaults.standard.bool(forKey: "showClimbsInTOC")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "showClimbsInTOC")
        }
    }

    var lastPath: Array<String>?
    {
        get {
            return UserDefaults.standard.array(forKey: "lastPath") as? Array<String>
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "lastPath")
        }
    }
};
