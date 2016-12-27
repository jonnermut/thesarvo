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
    let defaults = UserDefaults.standard
    
    @IBOutlet weak var fontSize: UISegmentedControl!
    
    override func viewDidLoad()
    {
        setupNavButtons()
    }
    
    override func viewDidAppear(_ animated: Bool)
    {


        fontSize.selectedSegmentIndex = defaults.integer(forKey: "fontSizeIndex")
        
    }
    

    func setupNavButtons()
    {
        self.navigationItem.leftItemsSupplementBackButton = true
        self.navigationItem.leftBarButtonItem =
            UIBarButtonItem(image: UIImage(named: "hamburger"), style: UIBarButtonItemStyle.plain, target: self, action: #selector(SettingsViewController.hamburgerToggle) )
    }
    
    dynamic func hamburgerToggle()
    {
        AppDelegate.instance().drawerController.toggle()
    }
    
    @IBAction func fontSizeDidChange(_ sender: AnyObject)
    {
        defaults.set(fontSize.selectedSegmentIndex, forKey: "fontSizeIndex")
    }
}
