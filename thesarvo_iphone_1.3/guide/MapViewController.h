//
//  MapViewController.h
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2013.
//  Copyright (c) 2013 Asdeq Labs. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <MapKit/MapKit.h>

@interface MapViewController : UIViewController<MKMapViewDelegate>

@property (unsafe_unretained, nonatomic) IBOutlet MKMapView *mapView;
@property (strong, nonatomic) NSString* singleNodeData;
@property (strong, nonatomic) NSArray* allGpsNodes;

@property (strong, nonatomic) UIPopoverController *masterPopoverController;

@end
