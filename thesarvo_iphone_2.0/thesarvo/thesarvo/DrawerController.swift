//
//  SlideView.swift
//  SlideViewTest
//
//  Created by Jon Nermut on 14/11/2015.
//  Copyright © 2015 asdeqlabs. All rights reserved.
//

import UIKit

let PEEK_MARGIN: CGFloat = 44.0
let ANIMATION_DURATION = 0.15

func isIPhone() -> Bool
{
    return UIDevice.currentDevice().userInterfaceIdiom == .Phone
}

/*
To use simply instantiate NVMDrawerController as your root view in your AppDelegate, or in the
StoryBoard.
Once NVMDrawerController is instantiated, set the drawerSize of the NVMDrawerController,
and its leftViewControllerIdentifier, centerViewControllerIdentifier, and
rightViewControllerIdentifier to the Storyboard Identifier of the UIViewController
you want in the different locations.
*/
class DrawerController: UIViewController {
    
    // This is where you set the drawer size (i.e. for 1/3rd use 3.0, for 1/5 use 5.0)
    var drawerSize:CGFloat = 4.0
    var leftViewControllerIdentifier:String = "LeftController"
    var centerViewControllerIdentifier:String = "CenterController"
    var rightViewControllerIdentifier:String = "RightController"
    
    var hasRightDrawer = false
    
    private var _leftViewController:UIViewController?
    var leftViewController:UIViewController {
        get{
            if let vc = _leftViewController {
                return vc;
            }
            return UIViewController();
        }
    }
    private var _centerViewController:UIViewController?
    var centerViewController:UIViewController {
        get{
            if let vc = _centerViewController {
                return vc;
            }
            return UIViewController();
        }
    }
    private var _rightViewController:UIViewController?
    var rightViewController:UIViewController {
        get{
            if let vc = _rightViewController {
                return vc;
            }
            return UIViewController();
        }
    }
    
    static let NVMDrawerOpenLeft = 0
    static let NVMDrawerOpenRight = 1
    var openSide:Int {
        get{
            return _openSide;
        }
    }
    private var _openSide:Int = NVMDrawerOpenLeft
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Do any additional setup after loading the view.
        
        // Instantiate VC's with storyboard ID's
        _leftViewController = instantiateViewControllers(leftViewControllerIdentifier)
        _centerViewController = instantiateViewControllers(centerViewControllerIdentifier)
        
        if (hasRightDrawer)
        {
            _rightViewController = instantiateViewControllers(rightViewControllerIdentifier)
        }
        
        // Call configDrawers() and pass the drawerSize variable.
        drawDrawers(UIScreen.mainScreen().bounds.size)
        
        self.view.addSubview(leftViewController.view)
        self.view.addSubview(centerViewController.view)
        
        if (hasRightDrawer)
        {
            self.view.addSubview(rightViewController.view)
        }
        
    }
    
    override func viewWillTransitionToSize(size: CGSize, withTransitionCoordinator coordinator: UIViewControllerTransitionCoordinator) {
        coordinator.animateAlongsideTransition({ (UIViewControllerTransitionCoordinatorContext) -> Void in
            // This is for beginning of transition
            self.drawDrawers(size)
            }, completion: { (UIViewControllerTransitionCoordinatorContext) -> Void in
                // This is for after transition has completed.
        })
        
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    // MARK: - Drawing View
    
    func drawDrawers(size:CGSize) {
        // Calculate Center View's Size
        let centerWidth = (size.width/drawerSize) * (drawerSize - 1)
        
        
        if (hasRightDrawer)
        {
            // Left Drawer
            leftViewController.view.frame = CGRect(x: 0.0, y: 0.0, width: size.width/drawerSize, height: size.height)
            
            // Center Drawer
            centerViewController.view.frame = CGRect(x: leftViewController.view.frame.width, y: 0.0, width: centerWidth, height: size.height)
            
            // Right Drawer
            rightViewController.view.frame = CGRect(x: centerViewController.view.frame.origin.x + centerViewController.view.frame.size.width, y: 0.0, width: size.width/drawerSize, height: size.height)
            //rightViewController = rc
        }
        else
        {
            if isIPhone()
            {
                // for the iPhone
                leftViewController.view.frame = CGRect(x: 0.0, y: 0.0, width: size.width - PEEK_MARGIN, height: size.height)
                
                centerViewController.view.frame = CGRect(x: leftViewController.view.frame.width, y: 0.0, width: size.width - PEEK_MARGIN, height: size.height)
            }
        }
        
        // Capture the Swipes
        let swipeRight = UISwipeGestureRecognizer(target: self, action: Selector("swipeRightAction:"))
        swipeRight.direction = .Right
        centerViewController.view.addGestureRecognizer(swipeRight)
        leftViewController.view.addGestureRecognizer(swipeRight)
        
        let swipeLeft = UISwipeGestureRecognizer(target: self, action: Selector("swipeLeftAction:"))
        swipeLeft.direction = .Left
        centerViewController.view.addGestureRecognizer(swipeLeft)
        leftViewController.view.addGestureRecognizer(swipeLeft)
        
        if (openSide == DrawerController.NVMDrawerOpenLeft)
        {
            openLeftDrawer()
        }
        else
        {
            openRightDrawer()
        }
    }
    
    // MARK: - Open Drawers
    
    func openLeftDrawer() {
        _openSide = DrawerController.NVMDrawerOpenLeft
        UIView.animateWithDuration(ANIMATION_DURATION, delay: 0, options: UIViewAnimationOptions.CurveEaseIn, animations:
            { () -> Void in
                // move views here
                self.view.frame = CGRect(x: 0.0, y: 0.0, width: self.view.bounds.width, height: self.view.bounds.height)
            }, completion:
            { finished in
        })
    }
    
    func openRightDrawer() {
        _openSide = DrawerController.NVMDrawerOpenRight
        UIView.animateWithDuration(ANIMATION_DURATION, delay: 0, options: UIViewAnimationOptions.CurveEaseIn, animations:
            { () -> Void in
                // move views here
                self.view.frame = CGRect(x: PEEK_MARGIN + self.view.bounds.origin.x - self.leftViewController.view.bounds.size.width,
                    y: 0.0,
                    width: self.view.bounds.width,
                    height: self.view.bounds.height)
            }, completion:
            { finished in
        })
    }
    
    // MARK: - Swipe Handling
    
    func swipeRightAction(rec: UISwipeGestureRecognizer){
        self.openLeftDrawer()
    }
    
    func swipeLeftAction(rec:UISwipeGestureRecognizer){
        self.openRightDrawer()
    }
    
    // MARK: - Helpers
    
    func instantiateViewControllers(storyboardID: String) -> UIViewController {
        if let viewController = UIStoryboard(name: "Main", bundle: nil).instantiateViewControllerWithIdentifier("\(storyboardID)") as? UIViewController{
            return viewController;
        }
        
        return UIViewController();
    }
}
