//
//  MapViewController.m
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2013.
//  Copyright (c) 2013 Asdeq Labs. All rights reserved.
//

#import "MapViewController.h"
#import "XMLReader.h"
#import "MapPoint.h"
#import "IndexEntry.h"
#import "AppDelegate.h"

@interface MapViewController ()

@end

@implementation MapViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self)
    {
        // Custom initialization
    }
    return self;
}

- (void) viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    self.mapView.delegate = self;
}

- (void) viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];
    self.mapView.delegate = nil;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    
    
    NSMutableArray* annots = [NSMutableArray array];
    
    if (self.singleNodeData)
    {
    
        NSDictionary* data = [XMLReader dictionaryForXMLString: self.singleNodeData];
        
        NSLog(@"Map Data: %@", data);
        
        NSDictionary* gps = [data objectForKey:@"gps"];
        self.allGpsNodes = @[ gps ];
    }
    
    //self.mapView.u
    
    MKUserTrackingBarButtonItem *buttonItem = [[MKUserTrackingBarButtonItem alloc] initWithMapView:self.mapView];
    self.navigationItem.rightBarButtonItem = buttonItem;
    
    for (NSDictionary* gps in self.allGpsNodes)
    {
        if (gps)
        {
            NSArray* points = gps[@"point"];
            if ([points.class isSubclassOfClass:NSDictionary.class])
                points = @[points];

            
            if (points)
            {
                for (NSMutableDictionary* point in points)
                {
                    //NSMutableDictionary* mutablePoint = [NSMutableDictionary dictionaryWithDictionary:point];
                    
                    NSString* lat = point[@"latitude"];
                    NSString* lon = point[@"longitude"];
                    
                    //if (gps[@"viewId"])
                    //mutablePoint[@"viewId"] = gps[@"viewId"];
                    //if (gps[@"viewName"])
                    //    mutablePoint[@"viewName"] = gps[@"viewName"];
                    
                    IndexEntry* entry = gps[@"indexEntry"];
                    if (entry)
                        point[@"indexEntry"] = entry;
                    
                    if (lat && lon)
                    {
                        MapPoint* mapPoint = [[MapPoint alloc] init];
                        
                        NSString* viewName = entry ? entry.viewName : @"";
                        
                        if (self.singleNodeData)
                        {
                            mapPoint.title = point[@"description"];
                        }
                        else
                        {
                            mapPoint.title = [NSString stringWithFormat:@"%@-%@", viewName,point[@"description"] ];
                        }
                        
                        //mapPoint.subtitle = point[@"code"];
                        

                       
                        mapPoint.subtitle = [NSString stringWithFormat:@"%@ %@,%@", point[@"code"], lat, lon];
                        
                       
                        mapPoint.node = point;
                        
                        double dlat = [lat doubleValue];
                        double dlong = [lon doubleValue];
                        if (dlat != 0.0 && dlong != 0.0)
                        {
                            mapPoint.coordinate = CLLocationCoordinate2DMake(dlat, dlong);
                            
                            [self.mapView addAnnotation:mapPoint];
                            [annots addObject:mapPoint];
                        }
                    }
                }
                
                //[self.mapView showAnnotations:annots animated:YES];
                MKMapRect zoomRect = MKMapRectNull;
                for (id <MKAnnotation> annotation in annots)
                {
                    MKMapPoint annotationPoint = MKMapPointForCoordinate(annotation.coordinate);
                    MKMapRect pointRect = MKMapRectMake(annotationPoint.x, annotationPoint.y, 0.1, 0.1);
                    zoomRect = MKMapRectUnion(zoomRect, pointRect);
                }
                [self.mapView setVisibleMapRect:zoomRect animated:YES];
            }
        }
    }
    
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (AppDelegate*) delegate
{
    return (AppDelegate*)[[UIApplication sharedApplication]delegate];
}

- (MKAnnotationView *) mapView:(MKMapView *)mapView viewForAnnotation:(id <MKAnnotation>) annotation
{
    //return [UIButton buttonWithType:UIButtonTypeDetailDisclosure];
    static NSString *identifier = @"MapPoint";
    if ([annotation isKindOfClass:MapPoint.class])
    {
        MapPoint* point = (MapPoint*) annotation;
        
        MKPinAnnotationView *annotationView =
        (MKPinAnnotationView *)[self.mapView dequeueReusableAnnotationViewWithIdentifier:identifier];
        
        if (annotationView == nil)
        {
            annotationView = [[MKPinAnnotationView alloc]
                              initWithAnnotation:annotation
                              reuseIdentifier:identifier];
        }
        else
        {
            annotationView.annotation = annotation;
        }
        
        annotationView.enabled = YES;
        annotationView.canShowCallout = YES;
        
        //annotationView.frame = CGRectMake(0, 0, annotationView.frame.size.width, 100);
        
        // Create a UIButton object to add on the
        //UIButton *rightButton = [UIButton buttonWithType:UIButtonTypeDetailDisclosure];
        //[rightButton setTitle:annotation.title forState:UIControlStateNormal];
        
        //UIButton* rightButton = [UIButton buttonWithType:UIButtonTypeCustom];
        //rightButton.titleLabel.text = @"Open";
        UIButton *rightButton = [[UIButton alloc] initWithFrame:CGRectMake(0, 0, 60, 32)];
        [rightButton setTitle:@"Open" forState:UIControlStateNormal];
        [rightButton setTitleColor:[UIColor blueColor] forState:UIControlStateNormal];
        //rightButton.frame = CGRectMake(0, 0, 32, 32);
        rightButton.contentVerticalAlignment = UIControlContentVerticalAlignmentCenter;
        rightButton.contentHorizontalAlignment = UIControlContentHorizontalAlignmentCenter;

        if (!self.singleNodeData)
            annotationView.rightCalloutAccessoryView = rightButton;
        
        //UIButton *leftButton = [UIButton buttonWithType:UIButtonTypeInfoLight];
        //[leftButton setTitle:annotation.title forState:UIControlStateNormal];
        //[annotationView setLeftCalloutAccessoryView:leftButton];
        
        
        
        return annotationView;
    }
    
    return nil;
}

- (void)mapView:(MKMapView *)mapView annotationView:(MKAnnotationView *)view calloutAccessoryControlTapped:(UIControl *)control
{
    MapPoint* point = view.annotation;
    if (point)
    {
        IndexEntry* entry = point.node[@"indexEntry"];
        if (entry)
        {
            [self.delegate showView:entry.viewId
                          withTitle:entry.viewName
                         clearStack:NO
                      withElementId:entry.elementId];
        }
    }
}



@end
