//
//  NSURL.swift
//  AsdeqForms
//
//  Created by Jon Nermut on 20/11/2014.
//  Copyright (c) 2014 Asdeq Labs Pty Ptd. All rights reserved.
//

import Foundation

typealias URL = Foundation.URL

/// A bunch of extension methods to make file handling sane
extension Foundation.URL
{
    func fileExists() -> Bool
    {
        let fm = FileManager.default
        
        let path = self.path
        if (path != nil)
        {
            return fm.fileExists(atPath: path)
        }
        return false
    }
    
    func listDirectoryUrls() -> [Foundation.URL]
    {
        let fm = FileManager.default
        var ret = Array<Foundation.URL>()
        let enumerator : FileManager.DirectoryEnumerator = fm.enumerator(at: self, includingPropertiesForKeys: nil, options: [], errorHandler: nil)!
        for url in enumerator.allObjects
        {
            let nsurl = url as! Foundation.URL
            ret.append( nsurl )
        }
        return ret
    }
    
    func listDirectoryFilenames() -> [String]
    {
        let fm = FileManager.default
        var ret = Array<String>()
        let enumerator : FileManager.DirectoryEnumerator = fm.enumerator(at: self, includingPropertiesForKeys: nil, options: [], errorHandler: nil)!
        for url in enumerator.allObjects
        {
            let nsurl = url as! Foundation.URL
            let filename = nsurl.lastPathComponent
            ret.append( filename )
            
        }
        return ret
    }
    
    func mkdirs() -> Foundation.URL
    {
        let fm = FileManager.default
        var err : NSError?
        do {
            try fm.createDirectory(at: self, withIntermediateDirectories: true, attributes: nil)
        } catch let error as NSError {
            err = error
        }

        return self
    }
    
    func append(_ pathComponent: String) -> Foundation.URL
    {
        return appendingPathComponent(pathComponent)
    }
    
    static func documentDirectory() -> Foundation.URL
    {
        let fm = FileManager.default
        var err : NSError?
        let docsurl = try! fm.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        
        return docsurl
    }
    
    func moveTo( _ destFullUrl: Foundation.URL )
    {
        let fm = FileManager.default
        var err : NSError?
        do {
            try fm.moveItem(at: self, to: destFullUrl)
        } catch let error as NSError {
            err = error
        }
        
        if let actualError = err
        {
            print("Could not move \(self) to \(destFullUrl): \(actualError)")
        }
        // FIXME - return error
    }
    
    func moveToDir( _ destinationDir: Foundation.URL )
    {
        let fm = FileManager.default
        let destFullUrl = destinationDir.append(self.lastPathComponent)
        var err : NSError?
        do {
            try fm.moveItem(at: self, to: destFullUrl)
        } catch let error as NSError {
            err = error
        }
        
        if let actualError = err
        {
            print("Could not move \(self) to \(destFullUrl): \(actualError)")
        }
        // FIXME - return error
    }
    
    var fileModificationDate : Foundation.Date?
    {
        let fm = FileManager.default
        var err : NSError?
        
        let p = self.path
        
        do {
            let attributes = try fm.attributesOfItem(atPath: p) as NSDictionary
            let lastMod = attributes.fileModificationDate()
            return lastMod
        } catch let error as NSError {
            err = error
        }
        
        
        return nil
    }
    
    var fileSize : UInt64?
    {
        let fm = FileManager.default
        var err : NSError?
        
        let p = self.path
        
        do {
            let attributes = try fm.attributesOfItem(atPath: p) as NSDictionary
            let s = attributes.fileSize()
            return s
        } catch let error as NSError {
            err = error
        }
        
        
        return nil
    }
    
    var fileCreationDate : Foundation.Date?
    {
        let fm = FileManager.default
        var err : NSError?
        
        let p = self.path
        
        do {
            let attributes = try fm.attributesOfItem(atPath: p) as NSDictionary
            let c = attributes.fileCreationDate()
            return c
        } catch let error as NSError {
            err = error
        }
        
        
        return nil
    }
}
