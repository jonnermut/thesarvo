//
//  Array.swift
//  ExSwift
//
//  Created by pNre on 03/06/14.
//  Copyright (c) 2014 pNre. All rights reserved.
//

import Foundation

internal extension Array {
    
    fileprivate var indexesInterval: Range<Int> { return (0 ..< self.count) }
    



    /**
        Index of the first occurrence of item, if found.
    
        - parameter item: The item to search for
        - returns: Index of the matched item or nil
    */
    func indexOf <U: Equatable> (_ item: U) -> Int? {
        if item is Element {
            return unsafeBitCast(self, to: [U].self).indexOf(item)
        }

        return nil
    }
    
    /**
        Index of the first item that meets the condition.
    
        - parameter condition: A function which returns a boolean if an element satisfies a given condition or not.
        - returns: Index of the first matched item or nil
    */
    func indexOf (_ condition: (Element) -> Bool) -> Int? {
        for (index, element) in self.enumerated() {
            if condition(element) {
                return index
            }
        }
        
        return nil
    }

   

    /**
        Gets the object at the specified index, if it exists.
        
        - parameter index:
        - returns: Object at index in self
    */
    func get (_ index: Int) -> Element? {

        return index < count && index >= 0 ? self[index] : nil
    }



}
