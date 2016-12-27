//
//  GCD.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation
import UIKit

func runInBackground(_ block: @escaping ()->()) {
    DispatchQueue.global(priority: DispatchQueue.GlobalQueuePriority.background).async(execute: block)
}

func runOnMain(_ block: @escaping ()->()) {
    DispatchQueue.main.async(execute: block)
}

func synchronized<T>(_ lockObj: AnyObject!, closure: ()->T) -> T
{
    objc_sync_enter(lockObj)
    let retVal: T = closure()
    objc_sync_exit(lockObj)
    return retVal
}

func runAfterDelay(_ delayInSeconds:Double, closure:@escaping ()->()) {
    DispatchQueue.main.asyncAfter(
        deadline: DispatchTime.now() + Double(Int64(delayInSeconds * Double(NSEC_PER_SEC))) / Double(NSEC_PER_SEC), execute: closure)
}

func isIOS8OrLater() -> Bool
{
    switch UIDevice.current.systemVersion.compare("8.0.0", options: NSString.CompareOptions.numeric)
    {
        case .orderedSame, .orderedDescending:
            return true
        case .orderedAscending:
            return false
    }
}

func isIPhone() -> Bool
{
    return UIDevice.current.userInterfaceIdiom == .phone
}

func isIPad() -> Bool
{
    return UIDevice.current.userInterfaceIdiom == .pad
}
