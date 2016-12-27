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
    
    fileprivate var _leftViewController:UIViewController?
    var leftViewController:UIViewController {
        get{
            if let vc = _leftViewController {
                return vc;
            }
            return UIViewController();
        }
    }
    fileprivate var _centerViewController:UIViewController?
    var centerViewController:UIViewController {
        get{
            if let vc = _centerViewController {
                return vc;
            }
            return UIViewController();
        }
    }
    fileprivate var _rightViewController:UIViewController?
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
    fileprivate var _openSide:Int = NVMDrawerOpenLeft
    
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
        drawDrawers(UIScreen.main.bounds.size)
        
        self.view.addSubview(leftViewController.view)
        self.view.addSubview(centerViewController.view)
        
        if (hasRightDrawer)
        {
            self.view.addSubview(rightViewController.view)
        }
        
    }
    
    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        coordinator.animate(alongsideTransition: { (UIViewControllerTransitionCoordinatorContext) -> Void in
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
    
    func toggle()
    {
        if openSide == DrawerController.NVMDrawerOpenLeft
        {
            openRightDrawer()
        }
        else
        {
            openLeftDrawer()
        }
    }
    
    func set2ViewFrames(_ size:CGSize)
    {
        let isLeft = (openSide == DrawerController.NVMDrawerOpenLeft)
        
        if isIPhone()
        {
            let smallWidth = size.width - PEEK_MARGIN
            
            let offset = isLeft ? 0 : smallWidth
            
            // for the iPhone
            leftViewController.view.frame = CGRect(x: 0.0 - offset, y: 0.0, width: size.width - PEEK_MARGIN, height: size.height)
            
            centerViewController.view.frame = CGRect(x: smallWidth - offset, y: 0.0, width: size.width, height: size.height)
        }
        else
        {
            let leftWidth: CGFloat = isLeft ? 300 : 0
         
            leftViewController.view.frame = CGRect(x: 0.0 , y: 0.0, width: leftWidth, height: size.height)
            
            centerViewController.view.frame = CGRect(x: leftWidth, y: 0.0, width: size.width - leftWidth, height: size.height)
        }
    }
    
    func drawDrawers(_ size:CGSize) {
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
            set2ViewFrames(size)
        }
        
        // Capture the Swipes
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(DrawerController.swipeRightAction(_:)))
        swipeRight.direction = .right
        centerViewController.view.addGestureRecognizer(swipeRight)
        leftViewController.view.addGestureRecognizer(swipeRight)
        
        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(DrawerController.swipeLeftAction(_:)))
        swipeLeft.direction = .left
        centerViewController.view.addGestureRecognizer(swipeLeft)
        leftViewController.view.addGestureRecognizer(swipeLeft)
        
        self.logFrames()
        
        
        if (openSide == DrawerController.NVMDrawerOpenLeft)
        {
            openLeftDrawer()
        }
        else
        {
            openRightDrawer()
        }
    }
    
    func logFrames()
    {
        /*
        self.view.layer.borderColor = UIColor.blueColor().CGColor
        self.view.layer.borderWidth = 1
        self.leftViewController.view.layer.borderColor = UIColor.redColor().CGColor
        self.leftViewController.view.layer.borderWidth = 1
        self.centerViewController.view.layer.borderColor = UIColor.greenColor().CGColor
        self.centerViewController.view.layer.borderWidth = 1
        
        print("Drawer frame: \(self.view.frame)")
        print("Left frame: \(self.leftViewController.view.frame)")
        print("Center frame: \(self.centerViewController.view.frame)")
        */
    }
    
    // MARK: - Open Drawers
    
    func openLeftDrawer() {
        _openSide = DrawerController.NVMDrawerOpenLeft
        UIView.animate(withDuration: ANIMATION_DURATION, delay: 0, options: UIViewAnimationOptions.curveEaseIn, animations:
            { () -> Void in
                // move views here
                
                if (self.hasRightDrawer)
                {
                    self.view.frame = CGRect(x: 0.0, y: 0.0, width: self.view.bounds.width, height: self.view.bounds.height)
                }
                else
                {
                    self.set2ViewFrames(UIScreen.main.bounds.size)
                }
                
                self.logFrames()
            }, completion:
            { finished in
        })
    }
    
    func openRightDrawer() {
        _openSide = DrawerController.NVMDrawerOpenRight
        UIView.animate(withDuration: ANIMATION_DURATION, delay: 0, options: UIViewAnimationOptions.curveEaseIn, animations:
            { () -> Void in
                // move views here
                
                // PEEK_MARGIN + self.view.bounds.origin.x - self.leftViewController.view.bounds.size.width
                
                if self.hasRightDrawer
                {
                    self.view.frame = CGRect(x: self.leftViewController.view.bounds.size.width - PEEK_MARGIN,
                    y: 0.0,
                    width: self.view.bounds.width,
                    height: self.view.bounds.height)
                }
                else
                {
                    self.set2ViewFrames(UIScreen.main.bounds.size)
                }
                
                self.logFrames()
            }, completion:
            { finished in
        })
    }
    
    // MARK: - Swipe Handling
    
    func swipeRightAction(_ rec: UISwipeGestureRecognizer){
        self.openLeftDrawer()
    }
    
    func swipeLeftAction(_ rec:UISwipeGestureRecognizer){
        self.openRightDrawer()
    }
    
    // MARK: - Helpers
    
    func instantiateViewControllers(_ storyboardID: String) -> UIViewController {
        if let viewController = UIStoryboard(name: "Main", bundle: nil).instantiateViewController(withIdentifier: "\(storyboardID)") as? UIViewController{
            return viewController;
        }
        
        return UIViewController();
    }
    
    override var preferredStatusBarStyle : UIStatusBarStyle
    {
        return UIStatusBarStyle.lightContent
    }
    

}
