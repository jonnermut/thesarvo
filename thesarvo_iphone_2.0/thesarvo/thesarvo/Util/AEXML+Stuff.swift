//
//  AEXML+Stuff.swift
//  thesarvo
//
//  Created by Jon Nermut on 1/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation

extension AEXMLElement
{
    func childrenWithName(name: String ) -> [AEXMLElement]
    {
        return self.children.filter { $0.name == name }
    }
    
    func attr(name: String) -> String?
    {
        return self.attributes[name] 
    }
    
    
}