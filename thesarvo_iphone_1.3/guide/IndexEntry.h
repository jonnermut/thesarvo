//
//  IndexEntry.h
//  thesarvo
//
//  Created by Jon Nermut on 1/01/2014.
//  Copyright (c) 2014 Asdeq Labs. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface IndexEntry : NSObject

@property (nonatomic, strong) NSString* viewId;
@property (nonatomic, strong) NSString* viewName;
@property (nonatomic, strong) NSString* elementId;
@property (nonatomic, strong) NSString* text;
@property (nonatomic, strong) NSString* textClass;
@property (nonatomic) NSInteger order;

@end
