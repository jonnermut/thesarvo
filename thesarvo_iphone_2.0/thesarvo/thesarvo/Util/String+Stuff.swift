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
            return substringFromIndex( advance(self.startIndex, prefix.length) )
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
}