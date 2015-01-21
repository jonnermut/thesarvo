//
//  NSURL.swift
//  AsdeqForms
//
//  Created by Jon Nermut on 20/11/2014.
//  Copyright (c) 2014 Asdeq Labs Pty Ptd. All rights reserved.
//

import Foundation

typealias URL = NSURL

/// A bunch of extension methods to make file handling sane
extension NSURL
{
    func fileExists() -> Bool
    {
        let fm = NSFileManager.defaultManager()
        
        var path = self.path
        if (path != nil)
        {
            return fm.fileExistsAtPath(path!)
        }
        return false
    }
    
    func listDirectoryUrls() -> [NSURL]
    {
        let fm = NSFileManager.defaultManager()
        var ret = Array<NSURL>()
        let enumerator : NSDirectoryEnumerator = fm.enumeratorAtURL(self, includingPropertiesForKeys: nil, options: nil, errorHandler: nil)!
        for url in enumerator.allObjects
        {
            var nsurl = url as NSURL
            ret.append( nsurl )
        }
        return ret
    }
    
    func listDirectoryFilenames() -> [String]
    {
        let fm = NSFileManager.defaultManager()
        var ret = Array<String>()
        let enumerator : NSDirectoryEnumerator = fm.enumeratorAtURL(self, includingPropertiesForKeys: nil, options: nil, errorHandler: nil)!
        for url in enumerator.allObjects
        {
            var nsurl = url as NSURL
            if let filename = nsurl.lastPathComponent
            {
                ret.append( filename )
            }
        }
        return ret
    }
    
    func mkdirs() -> NSURL
    {
        let fm = NSFileManager.defaultManager()
        var err : NSError?
        fm.createDirectoryAtURL(self, withIntermediateDirectories: true, attributes: nil, error: &err)

        return self
    }
    
    func append(pathComponent: String) -> NSURL
    {
        return URLByAppendingPathComponent(pathComponent)
    }
    
    class func documentDirectory() -> NSURL
    {
        let fm = NSFileManager.defaultManager()
        var err : NSError?
        let docsurl = fm.URLForDirectory(.DocumentDirectory, inDomain: .UserDomainMask, appropriateForURL: nil, create: true, error: &err)!
        
        return docsurl
    }
    
    func moveTo( destFullUrl: URL )
    {
        let fm = NSFileManager.defaultManager()
        var err : NSError?
        fm.moveItemAtURL(self, toURL: destFullUrl, error: &err)
        
        if let actualError = err
        {
            println("Could not move \(self) to \(destFullUrl): \(actualError)")
        }
        // FIXME - return error
    }
    
    func moveToDir( destinationDir: URL )
    {
        let fm = NSFileManager.defaultManager()
        let destFullUrl = destinationDir.append(self.lastPathComponent!)
        var err : NSError?
        fm.moveItemAtURL(self, toURL: destFullUrl, error: &err)
        
        if let actualError = err
        {
            println("Could not move \(self) to \(destFullUrl): \(actualError)")
        }
        // FIXME - return error
    }
    
    var fileModificationDate : NSDate?
    {
        let fm = NSFileManager.defaultManager()
        var err : NSError?
        
        if let p = self.path
        {
            if let attributes : NSDictionary = fm.attributesOfItemAtPath(p, error: &err)
            {
                var lastMod = attributes.fileModificationDate()
                return lastMod
            }
        }
        
        return nil
    }
    
    var fileCreationDate : NSDate?
    {
        let fm = NSFileManager.defaultManager()
        var err : NSError?
        
        if let p = self.path
        {
            if let attributes : NSDictionary = fm.attributesOfItemAtPath(p, error: &err)
            {
                var c = attributes.fileCreationDate()
                return c
            }
        }
        
        return nil
    }
}