//
//  AppDelegate.h
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "DetailViewController.h" 

@interface AppDelegate : UIResponder <UIApplicationDelegate, UISplitViewControllerDelegate>

@property (strong, nonatomic) UIWindow *window;

@property (strong, nonatomic) UINavigationController *navigationController;
@property (strong, nonatomic) UINavigationController *detailNavigationController;

@property (strong, nonatomic) UISplitViewController *splitViewController;
@property (strong, nonatomic) DetailViewController* detailViewController;

@property (strong, nonatomic) NSArray* views;
@property (strong, nonatomic) NSDictionary* viewIds;
@property BOOL indexDone;
@property (strong, nonatomic) NSDictionary* index;
@property (strong, nonatomic) NSArray* allGps;

- (void) showView: (NSString*) viewId
        withTitle: (NSString*) title
       clearStack: (BOOL) clearStack
    withElementId: (NSString*) elementId;

- (BOOL)splitViewController:(UISplitViewController *)svc shouldHideViewController:(UIViewController *)vc inOrientation:(UIInterfaceOrientation)orientation;

- (NSString *) getGuideData: (NSString*) _guideId;

@end
