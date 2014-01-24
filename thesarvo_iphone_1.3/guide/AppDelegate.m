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
#import "IndexEntry.h"
#import "MapViewController.h"

@implementation AppDelegate

@synthesize window = _window;
@synthesize navigationController = _navigationController;
@synthesize splitViewController = _splitViewController;
@synthesize views;
@synthesize detailNavigationController;
@synthesize detailViewController;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    CGRect bounds = [[UIScreen mainScreen] bounds];
    self.window = [[UIWindow alloc] initWithFrame: bounds];
    
    //NSURL *filePath = [[NSBundle mainBundle] URLForResource:@"config" withExtension:@"xml" ];
    
    NSString* filePath = [[NSBundle mainBundle] pathForResource:@"config" ofType:@"xml"];
    
    NSString* xml = [NSString stringWithContentsOfFile:filePath];
    NSDictionary* config = [XMLReader dictionaryForXMLString:xml]; 
    
    
    
    self.views = config[@"config"][@"view"];
    
    
    
    NSArray* homedata = [[[self.views objectAtIndex:0] objectForKey:@"data"] objectForKey:@"listItem"];
    
    self.viewIds = [NSMutableDictionary dictionary];
    for (NSDictionary* view in views)
    {
        for (NSDictionary* listItem in view[@"data"][@"listItem"])
        {
            NSString* text = listItem[@"text"];
            NSString* viewId = listItem[@"viewId" ];
            
            if (viewId && text)
                [self.viewIds setValue:text forKey:viewId];
        }
    }
    
    NSLog(@"%@", views);
    NSLog(@"%@", self.viewIds);
    
    // Override point for customization after application launch.
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPhone) 
    {
        MasterViewController *masterViewController = [[MasterViewController alloc] initWithNibName:@"MasterViewController" bundle:nil];
        self.navigationController = [[UINavigationController alloc] initWithRootViewController:masterViewController];
        
        self.navigationController.view.frame = self.window.frame;
        
        self.window.rootViewController = self.navigationController;
        self.navigationController.view.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
        
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
    
    //self.navigationController.navigationBar.barStyle = UIBarStyleBlackTranslucent;
    //self.navigationController.navigationBar.backgroundColor = [UIColor colorWithRed:0.5 green:0.5 blue:1 alpha:1];
    //self.navigationController.navigationBar.tintColor = [UIColor blueColor];
    //self.detailNavigationController.navigationBar.barStyle = UIBarStyleBlackTranslucent;
    //self.detailNavigationController.navigationBar.backgroundColor = [UIColor colorWithRed:0.5 green:0.5 blue:1 alpha:1];
    
    [self.window makeKeyAndVisible];
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self createIndex];
    });
    
    
    return YES;
}

- (void) createIndex
{
    NSMutableDictionary* index = [NSMutableDictionary dictionary];
    NSMutableArray* allGps = [NSMutableArray array];
    
    for (NSString* viewId in self.viewIds)
    {
        NSString* viewName = self.viewIds[viewId];
        
        // index entry for the view itself
        IndexEntry* entry = [[IndexEntry alloc]init];
        entry.viewId = viewId;
        entry.text = viewName;
        index[viewName] = entry;
        
        if ([viewId hasPrefix:@"guide."])
        {
            NSDictionary* guide;
            {
                // load the guide xml
                NSString* xml = [self getGuideData:viewId];
                // parse it
                guide = [XMLReader dictionaryForXMLString:xml];
            }
            
            if (guide)
            {
                //NSLog(@"%@", guide);
                NSArray* climbs = guide[@"guide"][@"climb"];
                if ([climbs.class isSubclassOfClass:NSDictionary.class])
                {
                    climbs = @[climbs];
                }
                for (NSDictionary* climb in climbs)
                {
                    IndexEntry* entry = [[IndexEntry alloc]init];
                    entry.viewId = viewId;
                    entry.viewName = viewName;
                    entry.elementId = climb[@"id"];
                    
                    NSString* stars = climb[@"stars"] ? climb[@"stars"] : @"";
                    stars = [stars stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
                    NSString* grade = climb[@"grade"] ? climb[@"grade"] : @"";
                    NSString* name = climb[@"name"] ? climb[@"name"] : @"";
                    
                    NSString* text = [NSString stringWithFormat:@"%@ %@ %@", stars, grade, name];
                    text = [text stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
                    
                    //NSLog(@"%@", text);
                    entry.text = text;
                    index[text] = entry;
                }
                
                NSArray* texts = guide[@"guide"][@"text"];
                if ([texts.class isSubclassOfClass:NSDictionary.class])
                    texts = @[texts];
                
                for (NSDictionary* text in texts)
                {
                    NSString* clazz = text[@"class"];
                    if (clazz && [clazz hasPrefix:@"h"])
                    {
                        //NSLog(@"%@", text);
                        IndexEntry* entry = [[IndexEntry alloc]init];
                        entry.viewId = viewId;
                        entry.viewName = viewName;
                        entry.elementId = text[@"id"];
                        NSString* str = text[@"__text"];
                        str = [str stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
                        entry.text = str;
                        index[str] = entry;
                        
                    }
                }
                
                NSArray* gps = guide[@"guide"][@"gps"];
                if ([gps.class isSubclassOfClass:NSDictionary.class])
                {
                    gps = @[gps];
                }
                for (NSMutableDictionary* g in gps)
                {
                    IndexEntry* entry = [[IndexEntry alloc]init];
                    entry.viewId = viewId;
                    entry.viewName = viewName;
                    entry.elementId = g[@"id"];
                    
                    g[@"indexEntry"]= entry;
                }
                
                [allGps addObjectsFromArray:gps];

            }
        }
    }
    NSLog(@"Indexing finished",@"");
    self.allGps = allGps;
    self.index = index;
    self.indexDone = YES;
    
    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController* top = self.navigationController.topViewController;
        if ([top.class isSubclassOfClass:MasterViewController.class])
        {
            [(MasterViewController*)top update];
        }
    });
}

- (void) showView: (NSString*) viewId
        withTitle: (NSString*) title
       clearStack: (BOOL) clearStack
    withElementId: (NSString*) elementId
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
     

        
    if ([viewId hasPrefix:@"guide."]
        || [viewId isEqualToString:@"Map"]
        || [viewId hasPrefix:@"http"])
    {
        UIViewController* newView = nil;
        
        
        
        if ([viewId isEqualToString:@"Map"])
        {
            MapViewController* mvc = [[MapViewController alloc] init];
            mvc.allGpsNodes = self.allGps;
            newView = mvc;

        }
        else
        {
            DetailViewController* dvc = [[DetailViewController alloc] initWithNibName:@"DetailViewController" bundle:nil];
            
            if ([viewId hasPrefix:@"guide."])
                viewId = [viewId substringFromIndex:6];
            
            dvc.guideId = viewId;
            
            if (elementId)
            {
                dvc.elementId = elementId;
            }
            
            if (self.splitViewController)
                dvc.masterPopoverController = self.detailViewController.masterPopoverController;
            
            newView = dvc;
        }
        
        newView.title = title;
        
        if (self.splitViewController)
        {
            //self.splitViewController.viewControllers = [NSArray arrayWithObjects:self.navigationController, newView, nil];
            
            if (clearStack)
            {
                self.detailNavigationController.viewControllers = [NSArray arrayWithObject:newView];
            }
            else
            {
                [self.detailNavigationController pushViewController:newView animated:YES];
            }
            
            UIBarButtonItem* bbi = [self.detailViewController.navigationItem leftBarButtonItem];
            if (bbi)
            {
                [newView.navigationItem setLeftBarButtonItem:bbi];
                
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




- (NSString *) getGuideData: (NSString*) _guideId
{
    if ([_guideId hasPrefix:@"guide."])
    {
        _guideId = [_guideId substringFromIndex:6];
    }
    
    
    NSString *data;
    NSString* prefix = @"http-3A-2F-2Fwww.thesarvo.com-2Fconfluence-2Fplugins-2Fservlet-2Fguide-2Fxml-2F";
    NSString* filename = [NSString stringWithFormat:@"%@%@", prefix, _guideId];
    NSURL* url = [[NSBundle mainBundle] URLForResource:filename withExtension:@"" subdirectory:@"www/data"];
    
    NSError* error;
    data = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
    return data;
}

@end
