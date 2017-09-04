//
//  GuideDownloader.swift
//  thesarvo
//
//  Created by Jon Nermut on 26/12/2015.
//  Copyright © 2015 thesarvo. All rights reserved.
//

import Foundation
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

fileprivate func >= <T : Comparable>(lhs: T?, rhs: T?) -> Bool {
  switch (lhs, rhs) {
  case let (l?, r?):
    return l >= r
  default:
    return !(lhs < rhs)
  }
}


class Updates:AEXMLDocument
{
    

    
    override func addChild(name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
    {
        return addChild( UpdatesElement(name, value: value, attributes: attributes) )
    }
    
    var updatesElement: UpdatesElement? { return self.children[0] as? UpdatesElement }
    
    var updates: [Update]
    {
        var ret: [Update] = []
        if let c = self.updatesElement?.children
        {
            for child in c
            {
                if let u = child as? Update
                {
                    ret.append(u)
                }
            }
        }
        return ret
    }
    
    func addIfNotPresent(_ update: Update)
    {
        let existing = updates.index()
        {
            u in
            return u.filename == update.filename
        }
        if existing != nil
        {
            return
        }
        
        self.updatesElement?.addChild(update)
    }
    
    func removeUpdate(_ update: Update)
    {
        update.removeFromParent()
    }
}

class UpdatesElement : AEXMLElement
{
    override func addChild(name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
    {
        return addChild( Update(name, value: value, attributes: attributes) )
    }
    
    var maxLastMod: Int64?
    {
        get
        {
            if let max = attr("maxLastMod")
            {
                return Int64(max)
            }
            return nil
        }
        set
        {
            if let newValue = newValue
            {
                self.attributes["maxLastMod"] = "\(newValue)"
            }
        }
    }
}

class Update : AEXMLElement
{
    var url: String? { return attributes["url"] }
    var filename: String? { return attributes["filename"] }
    var lastModified: String? { return attributes["lastModified"] }
}

class GuideDownloader: NSObject, URLSessionDelegate, URLSessionDownloadDelegate
{
    let HTML_MARKER = "<html>".data(using: .utf8)!
    
    let BASE_URL = "http://www.thesarvo.com/confluence"
    let SYNC_URL = "http://www.thesarvo.com/confluence/plugins/servlet/guide/sync/"
    
    var since: Int64 = 0
    
    var desktopMode = false
    
    var directory: String!
    
    var directoryUrl: Foundation.URL { return Foundation.URL(fileURLWithPath: directory) }
    
    var syncing: Bool
    {
        get { return self.completedOps != self.totalOps && self.totalOps > 0 }
    }
    
    var progress: Float
    {
        if totalOps == 0
        {
            return 0.0
        }
        return Float(completedOps) / Float(totalOps)
    }
    
    var labelText: String
    {
        if syncing
        {
            if completedOps == 0
            {
                return "Checking for updates"
            }
            else
            {
                return "Updating: \(completedOps) of \(totalOps)"
            }
        }
        else
        {
            return "Up to date"
        }
    }
    
    

    
    var completedOps = 0
    var totalOps = 0
    
    var queue = OperationQueue()
    
    var backgroundsession: Foundation.URLSession!
    var session: Foundation.URLSession!
    
    let fm = FileManager.default
    
    var taskToUpdate = Dictionary<Int, Update>()
    
    var updates: Updates?
    
    
    
    init(directory: String)
    {
        super.init()
        self.directory = directory
        queue.maxConcurrentOperationCount = 1
        queue.name = "Sync queue"
        
        let config = URLSessionConfiguration.background(withIdentifier: "com.thesarvo")

        backgroundsession = Foundation.URLSession(configuration: config, delegate: self, delegateQueue: queue)
        
        
        //session = NSURLSession(configuration: NSURLSessionConfiguration.defaultSessionConfiguration(), delegate: nil, delegateQueue: queue)

        session = Foundation.URLSession.shared
        
        
        // check if we have a newer resource updates.xml than our local one
        maybeCopyResourceUpdatesXml()
         
    }
    
    var updatesFilePath: String { return finalPath("updates.xml") }
    
    func maybeCopyResourceUpdatesXml()
    {
        if let resourceURL = Bundle.main.url(forResource: "updates", withExtension: "xml", subdirectory: "www/data")
        {
            let resourceLastMod = resourceURL.fileModificationDate
            
            let updatesFileUrl = Foundation.URL(fileURLWithPath:updatesFilePath)
            
            if !updatesFileUrl.fileExists()
            {
                try? fm.copyItem(at: resourceURL, to: updatesFileUrl)
            }
            else
            {
                if resourceLastMod?.timeIntervalSince1970 > updatesFileUrl.fileModificationDate?.timeIntervalSince1970
                {
                    // resource is newer
                    try? fm.removeItem(at: updatesFileUrl)
                    try? fm.copyItem(at: resourceURL, to: updatesFileUrl)
                }
            }
            
        }
        

    }
    
    func getUpdates() -> Updates
    {
        if let updates = updates
        {
            return updates
        }
        
        let filename = updatesFilePath
        if fm.fileExists(atPath: filename)
        {
            let data = try? Data(contentsOf: Foundation.URL(fileURLWithPath: filename))
            if let data = data
            {
                do
                {
                    updates = try Updates(xmlData: data)
                }
                catch
                {
                    print("Unexpected error loading updates.xml: \(error)")
                }
            }
        }
        
        if updates == nil
        {
            updates = Updates(root: AEXMLElement("updates"))
        }
        
        return updates! // must be non nil by here
    }
    
    func saveUpdates()
    {
        let filename = updatesFilePath
        if let updates = updates
        {
            let xml = updates.xmlString
            try? xml.write(toFile: filename, atomically: true, encoding: String.Encoding.utf8)
        }
    }
    
    func startSync()
    {
        if self.syncing
        {
            print("Already syncing, not starting again")
            return
        }
        
        queue.addOperation()
        {
            if let s = self.getUpdates().updatesElement?.maxLastMod
            {
                self.since = s
            }
            
            self.completedOps = 0
            self.totalOps = 1
            
            let url = Foundation.URL(string: "\(self.SYNC_URL)\(self.since)" )
            let request = URLRequest( url: url!)
            
            let dt = self.session.dataTask(with: request)
            {
                (data: Data?, response: URLResponse?, error: Error?) -> Void in
                
                if let e = error
                {
                    print("Unexpected error: \(e)")
                }
                else if let data = data
                {
                    self.handleSyncData(data)
                }
                self.incrementCompletedOps()
            }

            dt.resume()
        }

    }
    
    func handleSyncData(_ data: Data)
    {
        let existingUpdates = getUpdates()
        
        let doc = try? Updates(xmlData: data)
        
        // process the new updates
        if let doc = doc
        {
            for update in doc.updates
            {
                 existingUpdates.addIfNotPresent(update)
            }
            
            if let mlm = doc.updatesElement?.maxLastMod
            {
                existingUpdates.updatesElement?.maxLastMod = mlm
            }
            
            saveUpdates()
        }
        else
        {
            print("Sync xml did not parse")
        }
        
        // now iterate through all of them
        
        let allUpdates = existingUpdates.updates
        
        if (allUpdates.count == 0)
        {
            print("Nothing to do")
        }
        
        for update in allUpdates
        {
            let lastModifiedDouble = Double(update.lastModified ?? "0")
            
            if let url = update.url
            {
                if let filename = update.filename
                {
                    var weHaveNewer = false
                    let attrs = try? fm.attributesOfItem( atPath: finalPath(filename) )
                    if let attrs = attrs
                    {
                        if let lastMod = attrs[FileAttributeKey.modificationDate] as? Foundation.Date
                        {
                            if lastMod.timeIntervalSince1970 * 1000 >= lastModifiedDouble
                            {
                                //weHaveNewer = true
                                
                                if (self.desktopMode)
                                {
                                    print("Not downloading \(filename) as we have a newer file already")
                                }
                            }
                        }
                    }
                    
                    if !weHaveNewer
                    {
            
                        self.download(update)
                        
                    }
                    else
                    {
                        getUpdates().removeUpdate(update)
                        
                    }
            
                }
            }


        }
        saveUpdates()
    }
    
    func download(_ update: Update)
    {
        if let url = update.url
        {
            let nsurl = Foundation.URL(string: url)
            if let nsurl = nsurl
            {
                print("Starting download of \(nsurl)")
                let dt = backgroundsession.downloadTask(with: nsurl)
                
                dt.resume()
                self.taskToUpdate[dt.taskIdentifier] = update
                totalOps += 1
            }
            else
            {
                print("Invalid url: \(url)")
            }
        }
    }
    
    func finalPath(_ filename: String) -> String
    {
        return "\(directory!)/\(filename)"
    }
    
    func incrementCompletedOps()
    {
        completedOps+=1
        print("incrementCompletedOps, now: \(completedOps)")
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?)
    {
        if let error = error
        {
            print("Error downloading \(task) - \(error)")
            incrementCompletedOps()
            
        }
        
    }
    
    func checkCorrectGuide(path: String) -> Bool
    {
        do
        {
            let data = try Data(contentsOf: Foundation.URL(fileURLWithPath: path))
            
            let doc = try GuideDocument(xmlData: data)
            
            if let ge = doc["guide"] as? GuideElement
            {
                return true
            }
            
        }
        catch
        {
            print("Error checking guide: \(error)")
        }
        return false
    }
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL)
    {
        print("downloadTask didFinishDownloadingTo  \(downloadTask)")
        
        defer {
            
            incrementCompletedOps()
        }
        
        if let update = taskToUpdate[downloadTask.taskIdentifier]
        {
            if let filename = update.filename
            {
                print("Finished \(filename) downloading to \(location)")
                
                if let resp = downloadTask.response as? HTTPURLResponse
                {
                    if resp.statusCode != 200
                    {
                        print("Status code for url: \(downloadTask.originalRequest?.url) filename:\(filename) was \(resp.statusCode)")
                        return;
                    }
                }
                
                
                do
                {
                    let p = location.path
                    
                    if !location.fileExists()
                    {
                        return
                    }
                    
                    if let size = location.fileSize
                    {
                        if size == 0
                        {
                            print("File \(filename) was zero bytes")
                            return
                        }
                    }
                    
                    let d = try Data(contentsOf: location)
                    let ml = min(20, d.count)
                    //let sub = d[0..<ml]
                    if let r = d.range(of: HTML_MARKER, in: 0..<ml)
                    {
                        print("Found html marker in \(filename) at \(location), ignoring")
                        return
                    }
                    
                    if p.hasSuffix(".xml") && !checkCorrectGuide( path: p )
                    {
                        print("Guide check failed on: \(p)")
                        return; // try again next time
                    }
                    
                    
                    let path = finalPath(filename)
                    if (fm.fileExists(atPath: path))
                    {
                        try fm.removeItem(atPath: path)
                    }
                    try fm.moveItem(atPath: location.path, toPath: path )
                    
                    // remove the successful update and save the queue
                    getUpdates().removeUpdate(update)
                    saveUpdates()
                }
                catch
                {
                    print("Failed to move \(filename) : \(error)")
                }
            }
            

        }
        
        
    }
    
    func getUrls(_ id: String) -> Dictionary<String, String>
    {
        var ret = Dictionary<String, String>()
        for url in directoryUrl.listDirectoryUrls()
        {
            let urlstr = url.description
            let filename = url.lastPathComponent ?? ""
            if (filename.startsWith("\(id).") || filename.startsWith("\(id)-"))
            {
                ret[filename] = urlstr
            }
        }
        return ret
    }
}
