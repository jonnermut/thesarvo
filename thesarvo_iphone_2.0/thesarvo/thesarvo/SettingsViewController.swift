//
//  SettingsViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 10/01/2016.
//  Copyright © 2016 thesarvo. All rights reserved.
//

import UIKit

class SettingsViewController: UIViewController
{
    let defaults = NSUserDefaults.standardUserDefaults()
    
    @IBOutlet weak var fontSize: UISegmentedControl!
    
    override func viewDidLoad()
    {
        setupNavButtons()
    }
    
    override func viewDidAppear(animated: Bool)
    {


        fontSize.selectedSegmentIndex = defaults.integerForKey("fontSizeIndex")
        
    }
    

    func setupNavButtons()
    {
        self.navigationItem.leftItemsSupplementBackButton = true
        self.navigationItem.leftBarButtonItem =
            UIBarButtonItem(image: UIImage(named: "hamburger"), style: UIBarButtonItemStyle.Plain, target: self, action: Selector("hamburgerToggle") )
    }
    
    dynamic func hamburgerToggle()
    {
        AppDelegate.instance().drawerController.toggle()
    }
    
    @IBAction func fontSizeDidChange(sender: AnyObject)
    {
        defaults.setInteger(fontSize.selectedSegmentIndex, forKey: "fontSizeIndex")
    }
}