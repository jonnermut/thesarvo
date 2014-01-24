//
//  MapPoint.h
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2013.
//  Copyright (c) 2013 Asdeq Labs. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <MapKit/MapKit.h>

@interface MapPoint : NSObject<MKAnnotation>

@property (nonatomic) CLLocationCoordinate2D coordinate;
@property (nonatomic, copy) NSString* title;
@property (nonatomic, copy) NSString* subtitle;
@property (nonatomic, strong) NSDictionary* node;

@end
