//
//  AppDelegate.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate
{

    var window: UIWindow?
    
//    var splitViewController : UISplitViewController?
//    var navigationController : UINavigationController?
//    var containerController : ContainerViewController?
    
    var drawerController: DrawerController!


    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool
    {
        // Override point for customization after application launch.
        
        drawerController = self.window!.rootViewController as! DrawerController
        
        /*
        if (self.window!.rootViewController is UINavigationController)
        {
            // ios 7 on iphone :(
            navigationController = self.window!.rootViewController as? UINavigationController
        }
        else if (self.window!.rootViewController is UISplitViewController)
        {
            
            splitViewController = self.window!.rootViewController as? UISplitViewController
            
            navigationController = splitViewController?.viewControllers[splitViewController!.viewControllers.count-1] as? UINavigationController
            
            if isIOS8OrLater()
            {

                
                // wrap the split view in the ContainerViewController, so we can frig with the traits it receives
                containerController = ContainerViewController()
                containerController?.viewController = splitViewController
                self.window!.rootViewController = containerController;
                
                setupSplitViewButtons()
                

                splitViewController?.preferredDisplayMode = preferredMode

                
                if isIPhone()
                {

                    splitViewController?.preferredPrimaryColumnWidthFraction = 0.8
                    
                }
                else
                {
                    
                    splitViewController?.preferredPrimaryColumnWidthFraction = 0.3
                    
                }
                
                
            }
            
            splitViewController?.delegate = self
        }
*/
        
        // main init of the model
        Model.instance.load()
        
        return true
    }
    
    class func instance() -> AppDelegate
    {
        return UIApplication.shared.delegate as! AppDelegate
    }
    
    func animateClosed()
    {
        /*
        UIView.animateWithDuration(0.2, animations:
        {
            if let sv = self.splitViewController
            {
                sv.preferredDisplayMode = UISplitViewControllerDisplayMode.PrimaryHidden
                
            }
        })
*/
        drawerController.openRightDrawer()
    }
    

    
    func animateOpen()
    {
        drawerController.openLeftDrawer()
        /*
        UIView.animateWithDuration(0.2, animations:
        {
            if let sv = self.splitViewController
            {
                sv.preferredDisplayMode = self.preferredMode
                
            }
        })
*/
    }
    
    func hideMasterIfNecessary()
    {
        if isIPhone() && isIOS8OrLater()
        {
            animateClosed()
        }
    }


    func applicationWillResignActive(_ application: UIApplication)
    {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication)
    {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication)
    {
        // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
        
        
    }

    func applicationDidBecomeActive(_ application: UIApplication)
    {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        
        Model.instance.maybeSync()
    }

    func applicationWillTerminate(_ application: UIApplication)
    {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }


    func setDetail(_ vc: UIViewController, showNow: Bool = true)
    {
        let nc = drawerController.centerViewController as? UINavigationController
        if let nc = nc
        {
            nc.viewControllers = [vc]
        }
        if (showNow)
        {
            hideMasterIfNecessary()
        }
    }

}

