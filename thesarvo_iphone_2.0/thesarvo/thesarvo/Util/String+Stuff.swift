//
//  String+Stuff.swift
//  thesarvo
//
//  Created by Jon Nermut on 2/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation

extension String
{
    func removePrefixIfPresent(prefix: String) -> String
    {
        if (self.hasPrefix(prefix))
        {
            return self.substringFromIndex( self.startIndex.advancedBy( prefix.characters.count))
        }
        return self
    }
    
    func startsWith(prefix: String) -> Bool
    {
        return hasPrefix(prefix)
    }
    
    func endsWith(suffix: String) -> Bool
    {
        return hasSuffix(suffix)
    }
    
    func contains(other: String) -> Bool
    {
        return rangeOfString(other) != nil
    }
    
    func containsCaseInsensitive(other: String) -> Bool
    {
        return lowercaseString.rangeOfString(other.lowercaseString) != nil
    }
    
    /**
    Strips whitespaces from the beginning of self.
    
    - returns: Stripped string
    */
    func ltrimmed () -> String {
        if let range = rangeOfCharacterFromSet(NSCharacterSet.whitespaceAndNewlineCharacterSet().invertedSet) {
            return self[range.startIndex..<endIndex]
        }
        
        return self
    }
    
    /**
    Strips whitespaces from the end of self.
    
    - returns: Stripped string
    */
    func rtrimmed () -> String {
        if let range = rangeOfCharacterFromSet(NSCharacterSet.whitespaceAndNewlineCharacterSet().invertedSet, options: NSStringCompareOptions.BackwardsSearch) {
            return self[startIndex..<range.endIndex]
        }
        
        return self
    }
    
    /**
    Strips whitespaces from both the beginning and the end of self.
    
    - returns: Stripped string
    */
    func trimmed () -> String {
        return ltrimmed().rtrimmed()
    }
    
    func appendPathComponent(str:String) -> String
    {
        return (self as NSString).stringByAppendingPathComponent(str)
    }
    
    
}

/**
Repeats the string first n times
*/
public func * (first: String, n: Int) -> String
{
    var result = String()
    
    for var i=0;i<n;i++
    {
        
        result += first
    }
    
    return result
}