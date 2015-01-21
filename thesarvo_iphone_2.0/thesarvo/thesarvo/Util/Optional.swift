//
//  Optional.swift
//  thesarvo
//
//  Created by Jon Nermut on 17/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation

extension Optional
{
    func valueOr(val:T) -> T
    {
        if self != nil
        {
            return self!
        }
        else
        {
            return val
        }
        
    }
}