//
//  GCD.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation
import UIKit

func runInBackground(block: dispatch_block_t) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), block)
}

func runOnMain(block: dispatch_block_t) {
    dispatch_async(dispatch_get_main_queue(), block)
}

func synchronized<T>(lockObj: AnyObject!, closure: ()->T) -> T
{
    objc_sync_enter(lockObj)
    let retVal: T = closure()
    objc_sync_exit(lockObj)
    return retVal
}

func runAfterDelay(delayInSeconds:Double, closure:()->()) {
    dispatch_after(
        dispatch_time(
            DISPATCH_TIME_NOW,
            Int64(delayInSeconds * Double(NSEC_PER_SEC))
        ),
        dispatch_get_main_queue(), closure)
}

func isIOS8OrLater() -> Bool
{
    switch UIDevice.currentDevice().systemVersion.compare("8.0.0", options: NSStringCompareOptions.NumericSearch)
    {
        case .OrderedSame, .OrderedDescending:
            return true
        case .OrderedAscending:
            return false
    }
}

func isIPhone() -> Bool
{
    return UIDevice.currentDevice().userInterfaceIdiom == .Phone
}

func isIPad() -> Bool
{
    return UIDevice.currentDevice().userInterfaceIdiom == .Pad
}