//
//  GuideDownloader.swift
//  thesarvo
//
//  Created by Jon Nermut on 26/12/2015.
//  Copyright © 2015 thesarvo. All rights reserved.
//

import Foundation

class Updates:AEXMLDocument
{
    

    
    override func addChild(name name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
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
    
    func addIfNotPresent(update: Update)
    {
        let existing = updates.indexOf()
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
    
    func removeUpdate(update: Update)
    {
        update.removeFromParent()
    }
}

class UpdatesElement : AEXMLElement
{
    override func addChild(name name: String, value: String? = nil, attributes: [String : String]? = nil) -> AEXMLElement
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

class GuideDownloader: NSObject, NSURLSessionDelegate, NSURLSessionDownloadDelegate
{
    let BASE_URL = "http://www.thesarvo.com/confluence"
    let SYNC_URL = "http://www.thesarvo.com/confluence/plugins/servlet/guide/sync/"
    
    var since: Int64 = 0
    
    var desktopMode = false
    
    var directory: String!
    
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
    
    var queue = NSOperationQueue()
    
    var backgroundsession: NSURLSession!
    var session: NSURLSession!
    
    let fm = NSFileManager.defaultManager()
    
    var taskToUpdate = Dictionary<Int, Update>()
    
    var updates: Updates?
    
    
    
    init(directory: String)
    {
        super.init()
        self.directory = directory
        queue.maxConcurrentOperationCount = 1
        queue.name = "Sync queue"
        
        let config = NSURLSessionConfiguration.backgroundSessionConfigurationWithIdentifier("com.thesarvo")

        backgroundsession = NSURLSession(configuration: config, delegate: self, delegateQueue: queue)
        
        //session = NSURLSession(configuration: NSURLSessionConfiguration.defaultSessionConfiguration(), delegate: nil, delegateQueue: queue)

        session = NSURLSession.sharedSession()
        
        // check if we have a newer resource updates.xml than our local one
        maybeCopyResourceUpdatesXml()
         
    }
    
    var updatesFilePath: String { return finalPath("updates.xml") }
    
    func maybeCopyResourceUpdatesXml()
    {
        if let resourceURL = NSBundle.mainBundle().URLForResource("updates", withExtension: "xml", subdirectory: "www/data")
        {
            let resourceLastMod = resourceURL.fileModificationDate
            
            let updatesFileUrl = NSURL(fileURLWithPath:updatesFilePath)
            
            if !updatesFileUrl.fileExists()
            {
                try? fm.copyItemAtURL(resourceURL, toURL: updatesFileUrl)
            }
            else
            {
                if resourceLastMod?.timeIntervalSince1970 > updatesFileUrl.fileModificationDate?.timeIntervalSince1970
                {
                    // resource is newer
                    try? fm.removeItemAtURL(updatesFileUrl)
                    try? fm.copyItemAtURL(resourceURL, toURL: updatesFileUrl)
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
        if fm.fileExistsAtPath(filename)
        {
            let data = NSData(contentsOfFile: filename)
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
            try? xml.writeToFile(filename, atomically: true, encoding: NSUTF8StringEncoding)
        }
    }
    
    func startSync()
    {
        if self.syncing
        {
            print("Already syncing, not starting again")
            return
        }
        
        queue.addOperationWithBlock()
        {
            if let s = self.getUpdates().updatesElement?.maxLastMod
            {
                self.since = s
            }
            
            self.completedOps = 0
            self.totalOps = 1
            
            let url = NSURL(string: "\(self.SYNC_URL)\(self.since)" )
            let request = NSURLRequest( URL: url!)
            
            let dt = self.session.dataTaskWithRequest(request)
            {
                (data: NSData?, response: NSURLResponse?, error: NSError?) -> Void in
                
                if let e = error
                {
                    print("Unexpected error: \(e)")
                }
                else if let data = data
                {
                    self.handleSyncData(data)
                }
                self.completedOps++
            }
            dt.resume()
        }

    }
    
    func handleSyncData(data: NSData)
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
                    let attrs = try? fm.attributesOfItemAtPath( finalPath(filename) )
                    if let attrs = attrs
                    {
                        if let lastMod = attrs[NSFileModificationDate] as? NSDate
                        {
                            if lastMod.timeIntervalSince1970 * 1000 >= lastModifiedDouble
                            {
                                weHaveNewer = true
                                
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
    
    func download(update: Update)
    {
        if let url = update.url
        {
            let nsurl = NSURL(string: url)
            if let nsurl = nsurl
            {
                print("Staring download of \(nsurl)")
                let dt = backgroundsession.downloadTaskWithURL(nsurl)
                dt.resume()
                self.taskToUpdate[dt.taskIdentifier] = update
                totalOps++
            }
            else
            {
                print("Invalid url: \(url)")
            }
        }
    }
    
    func finalPath(filename: String) -> String
    {
        return "\(directory)/\(filename)"
    }
    
    func URLSession(session: NSURLSession, task: NSURLSessionTask, didCompleteWithError error: NSError?)
    {
        if let error = error
        {
            print("Error downloading \(task) - \(error)")
            completedOps++
        }
        
    }
    
    func URLSession(session: NSURLSession, downloadTask: NSURLSessionDownloadTask, didFinishDownloadingToURL location: NSURL)
    {
        if let update = taskToUpdate[downloadTask.taskIdentifier]
        {
            if let filename = update.filename
            {
                print("Finished \(filename) downloading to \(location)")
                
                do
                {
                    let path = finalPath(filename)
                    if (fm.fileExistsAtPath(path))
                    {
                        try fm.removeItemAtPath(path)
                    }
                    try fm.moveItemAtPath(location.path!, toPath: path )
                    
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
        
        completedOps++
    }
}