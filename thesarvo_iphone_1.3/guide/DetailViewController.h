//
//  DetailViewController.h
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <MapKit/MapKit.h>

@interface DetailViewController : UIViewController<UIWebViewDelegate, MKMapViewDelegate>


@property (strong, nonatomic) NSString* guideId;
@property (strong, nonatomic) NSString* elementId;
@property (strong, nonatomic) NSString* singleNodeData;

@property (strong, nonatomic) IBOutlet UILabel *detailDescriptionLabel;

@property (strong, nonatomic) UIPopoverController *masterPopoverController;
@property (unsafe_unretained, nonatomic) IBOutlet UIWebView *webview;

@property (weak, nonatomic) IBOutlet UIActivityIndicatorView *activity;


- (void)configureView;

@end
