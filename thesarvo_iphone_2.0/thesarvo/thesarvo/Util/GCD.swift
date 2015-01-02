//
//  GCD.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import Foundation

func runInBackground(block: dispatch_block_t) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), block)
}

func runOnMain(block: dispatch_block_t) {
    dispatch_async(dispatch_get_main_queue(), block)
}

func runAfterDelay(delayInSeconds:Double, closure:()->()) {
    dispatch_after(
        dispatch_time(
            DISPATCH_TIME_NOW,
            Int64(delayInSeconds * Double(NSEC_PER_SEC))
        ),
        dispatch_get_main_queue(), closure)
}