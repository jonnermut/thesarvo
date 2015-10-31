//
//  Array.swift
//  ExSwift
//
//  Created by pNre on 03/06/14.
//  Copyright (c) 2014 pNre. All rights reserved.
//

import Foundation

internal extension Array {
    
    private var indexesInterval: HalfOpenInterval<Int> { return HalfOpenInterval<Int>(0, self.count) }
    



    /**
        Index of the first occurrence of item, if found.
    
        - parameter item: The item to search for
        - returns: Index of the matched item or nil
    */
    func indexOf <U: Equatable> (item: U) -> Int? {
        if item is Element {
            return unsafeBitCast(self, [U].self).indexOf(item)
        }

        return nil
    }
    
    /**
        Index of the first item that meets the condition.
    
        - parameter condition: A function which returns a boolean if an element satisfies a given condition or not.
        - returns: Index of the first matched item or nil
    */
    func indexOf (condition: Element -> Bool) -> Int? {
        for (index, element) in self.enumerate() {
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
    func get (index: Int) -> Element? {

        //  If the index is out of bounds it's assumed relative
        func relativeIndex (index: Int) -> Int {
            var _index = (index % count)

            if _index < 0 {
                _index = count + _index
            }

            return _index
        }

        let _index = relativeIndex(index)
        return _index < count ? self[_index] : nil
    }



}