//
//  AppDelegate.m
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import "AppDelegate.h"

#import "MasterViewController.h"

#import "DetailViewController.h"
#import "XMLReader.h"

@implementation AppDelegate

@synthesize window = _window;
@synthesize navigationController = _navigationController;
@synthesize splitViewController = _splitViewController;
@synthesize views;
@synthesize detailNavigationController;
@synthesize detailViewController;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    
    //NSURL *filePath = [[NSBundle mainBundle] URLForResource:@"config" withExtension:@"xml" ];
    
    NSString* filePath = [[NSBundle mainBundle] pathForResource:@"config" ofType:@"xml"];
    
    NSString* xml = [NSString stringWithContentsOfFile:filePath];
    NSDictionary* config = [XMLReader dictionaryForXMLString:xml]; 
    
    
    
    self.views = [[config objectForKey:@"config"] objectForKey:@"view"];
    
    NSLog(@"%@", views);
    
    NSArray* homedata = [[[self.views objectAtIndex:0] objectForKey:@"data"] objectForKey:@"listItem"];
    
    // Override point for customization after application launch.
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPhone) 
    {
        MasterViewController *masterViewController = [[MasterViewController alloc] initWithNibName:@"MasterViewController" bundle:nil];
        self.navigationController = [[UINavigationController alloc] initWithRootViewController:masterViewController];
        
        self.window.rootViewController = self.navigationController;
        
        masterViewController.data = homedata;
    } 
    else 
    {
        MasterViewController *masterViewController = [[MasterViewController alloc] initWithNibName:@"MasterViewController" bundle:nil];
        self.navigationController = [[UINavigationController alloc] initWithRootViewController:masterViewController];
        
        masterViewController.data = homedata;
        
        masterViewController.title = @"thesarvo";
        
        self.detailViewController = [[DetailViewController alloc] initWithNibName:@"DetailViewController" bundle:nil];
        self.detailViewController.guideId = @"9404494";
        self.detailNavigationController = [[UINavigationController alloc] initWithRootViewController:detailViewController];
    	
        self.splitViewController = [[UISplitViewController alloc] init];
        
        //self.splitViewController.delegate = detailViewController;
        self.splitViewController.delegate = self;
        
        self.splitViewController.viewControllers = [NSArray arrayWithObjects:self.navigationController, self.detailNavigationController, nil];
        
        
        
        self.window.rootViewController = self.splitViewController;
    }
    
    self.navigationController.navigationBar.barStyle = UIBarStyleBlackTranslucent;
    //self.navigationController.navigationBar.backgroundColor = [UIColor colorWithRed:0.5 green:0.5 blue:1 alpha:1];
    //self.navigationController.navigationBar.tintColor = [UIColor blueColor];
    self.detailNavigationController.navigationBar.barStyle = UIBarStyleBlackTranslucent;
    //self.detailNavigationController.navigationBar.backgroundColor = [UIColor colorWithRed:0.5 green:0.5 blue:1 alpha:1];
    
    [self.window makeKeyAndVisible];
    return YES;
}

- (void) showView: (NSString*) viewId withTitle: (NSString*) title
{
    NSDictionary* view;
    for (NSDictionary* v in self.views)
    {
        if (v && [[v objectForKey:@"id"] isEqualToString:viewId])
        {
            view = v;
            break;
        }
    }
     

        
    if ([viewId hasPrefix:@"guide."] || [viewId isEqualToString:@"map"])
    {
        DetailViewController* newView = [[DetailViewController alloc] initWithNibName:@"DetailViewController" bundle:nil];
        
        newView.title = title;
        
        if ([viewId isEqualToString:@"map"])
        {
            // TODO - get hold of map data
            newView.showMap = YES;
        }
        else
        {
            newView.guideId = [viewId substringFromIndex:6];
        }
        
        if (self.splitViewController)
        {
            //self.splitViewController.viewControllers = [NSArray arrayWithObjects:self.navigationController, newView, nil];
            
            self.detailNavigationController.viewControllers = [NSArray arrayWithObject:newView];
            
            UIBarButtonItem* bbi = [self.detailViewController.navigationItem leftBarButtonItem];
            if (bbi)
            {
                [newView.navigationItem setLeftBarButtonItem:bbi];
                newView.masterPopoverController = self.detailViewController.masterPopoverController;
            }
        }
        else
        {
            [self.navigationController pushViewController:newView animated:YES];
        }
        self.detailViewController = newView;
    }
    else if (view)
    {
        MasterViewController* newView = [[MasterViewController alloc] initWithNibName:@"MasterViewController" bundle:nil];
        
        newView.data = [[view objectForKey:@"data"] objectForKey:@"listItem"];
        //newView.title = [view objectForKey:@"name"];
        newView.title = title;
        [self.navigationController pushViewController:newView animated:YES];
    }
    
}

#pragma mark - Split view

- (void)splitViewController:(UISplitViewController *)splitController willHideViewController:(UIViewController *)viewController withBarButtonItem:(UIBarButtonItem *)barButtonItem forPopoverController:(UIPopoverController *)popoverController
{
    
    barButtonItem.title = NSLocalizedString(@"Menu", @"Menu");
    [self.detailViewController.navigationItem setLeftBarButtonItem:barButtonItem animated:YES];
    self.detailViewController.masterPopoverController = popoverController;
}

- (void)splitViewController:(UISplitViewController *)splitController willShowViewController:(UIViewController *)viewController invalidatingBarButtonItem:(UIBarButtonItem *)barButtonItem
{
    // Called when the view is shown again in the split view, invalidating the button and popover controller.
    [self.detailViewController.navigationItem setLeftBarButtonItem:nil animated:YES];
    self.detailViewController.masterPopoverController = nil;
}

- (BOOL)splitViewController:(UISplitViewController *)svc shouldHideViewController:(UIViewController *)vc inOrientation:(UIInterfaceOrientation)orientation
{
    return NO;
}

#pragma mark app delegate

- (void)applicationWillResignActive:(UIApplication *)application
{
    /*
     Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
     Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
     */
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
    /*
     Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later. 
     If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
     */
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
    /*
     Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
     */
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
    /*
     Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
     */
}

- (void)applicationWillTerminate:(UIApplication *)application
{
    /*
     Called when the application is about to terminate.
     Save data if appropriate.
     See also applicationDidEnterBackground:.
     */
}

@end
