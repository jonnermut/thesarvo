//
//  ContainerViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 18/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import UIKit

class ContainerViewController: UIViewController
{
    var customTraitCollection : UITraitCollection? = nil
    {
        didSet
        {
            forceNewTrait()
        }
    }
    
    override func viewDidLoad()
    {
        
        let t1 = UITraitCollection(verticalSizeClass:.Regular)
        let t2 = UITraitCollection(horizontalSizeClass:.Regular)
        customTraitCollection = UITraitCollection(traitsFromCollections: [t1,t2])
    }

    private func forceNewTrait()
    {
        if let vc = self.viewController
        {
            self.setOverrideTraitCollection(customTraitCollection, forChildViewController:vc)
        }
    }
    
    var viewController : UISplitViewController? = nil
    {
        didSet
        {
            if let oldValue = oldValue
            {
                oldValue.willMoveToParentViewController(nil)
                oldValue.view.removeFromSuperview()
                oldValue.removeFromParentViewController()
                self.setOverrideTraitCollection(nil, forChildViewController:oldValue)
            }
            if let viewController = self.viewController
            {
                self.addChildViewController(viewController)
                let view = viewController.view
                self.view.addSubview(view)
                viewController.didMoveToParentViewController(self)
                forceNewTrait()
            }
        }
    }
    
    override func viewWillTransitionToSize(size: CGSize, withTransitionCoordinator coordinator: UIViewControllerTransitionCoordinator)
    {
        print( "viewWillTransitionToSize \(size)")
        
        let device = traitCollection.userInterfaceIdiom
        var portrait: Bool
        {
            if device == .Phone
            {
                return size.width > 320
            }
            else
            {
                return size.width > 768
            }
        }
        
        /*
        if size.width > 320
        {
            customTraitCollection = UITraitCollection(horizontalSizeClass:.Regular)
        }
        else
        {
            customTraitCollection = nil;
        }
*/
        // make the split view be a frickin split view all the time
        
//        if (portrait)
//        {
//            customTraitCollection = UITraitCollection(verticalSizeClass:.Regular)
//        }
//        else
//        {
//            customTraitCollection = UITraitCollection(horizontalSizeClass:.Regular)
//        }
        //customTraitCollection = UITraitCollection(traitsFromCollections: [t1,t2])
        
        super.viewWillTransitionToSize(size, withTransitionCoordinator: coordinator);
    }
    
    override func shouldAutomaticallyForwardAppearanceMethods() -> Bool
    {
        return true
    }
    
    override func shouldAutomaticallyForwardRotationMethods() -> Bool
    {
        return true
    }
}
