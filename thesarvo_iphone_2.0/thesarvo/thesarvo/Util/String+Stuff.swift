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
    func removePrefixIfPresent(_ prefix: String) -> String
    {
        if (self.hasPrefix(prefix))
        {
            return self.substring( from: self.characters.index(self.startIndex, offsetBy: prefix.characters.count))
        }
        return self
    }
    
    func startsWith(_ prefix: String) -> Bool
    {
        return hasPrefix(prefix)
    }
    
    func endsWith(_ suffix: String) -> Bool
    {
        return hasSuffix(suffix)
    }
    
    func contains(_ other: String) -> Bool
    {
        return range(of: other) != nil
    }
    
    func containsCaseInsensitive(_ other: String) -> Bool
    {
        return lowercased().range(of: other.lowercased()) != nil
    }
    
    /**
    Strips whitespaces from the beginning of self.
    
    - returns: Stripped string
    */
    func ltrimmed () -> String {
        if let range = rangeOfCharacter(from: CharacterSet.whitespacesAndNewlines.inverted) {
            return String(self[range.lowerBound..<endIndex])
        }
        
        return self
    }
    
    /**
    Strips whitespaces from the end of self.
    
    - returns: Stripped string
    */
    func rtrimmed () -> String {
        if let range = rangeOfCharacter(from: CharacterSet.whitespacesAndNewlines.inverted, options: NSString.CompareOptions.backwards) {
            return String(self[startIndex..<range.upperBound])
        }
        
        return self
    }
    
    /**
    Strips whitespaces from both the beginning and the end of self.
    
    - returns: Stripped string
    */
    func trimmed () -> String {
        
        return self.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
    }
    
    func appendPathComponent(_ str:String) -> String
    {
        return (self as NSString).appendingPathComponent(str)
    }
    
    
}

/**
Repeats the string first n times
*/
public func * (first: String, n: Int) -> String
{
    var result = String()
    
    for i in 0 ..< n
    {
        
        result += first
    }
    
    return result
}
