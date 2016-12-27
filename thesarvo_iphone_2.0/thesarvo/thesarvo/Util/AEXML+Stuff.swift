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
    func childrenWithName(_ name: String ) -> [AEXMLElement]
    {
        return self.children.filter { $0.name == name }
    }
    
    func attr(_ name: String) -> String?
    {
        return self.attributes[name] 
    }
    
    
}
