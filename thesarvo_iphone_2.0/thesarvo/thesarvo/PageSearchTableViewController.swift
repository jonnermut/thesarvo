//
//  PageSearchTableViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 3/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import UIKit

class PageSearchTableViewController: UITableViewController, UISearchBarDelegate
{

    @IBOutlet weak var searchBar: UISearchBar!
    
    var guide: Guide?
    
    /*
    {
        var vc = self.popoverPresentationController?.presentingViewController
        if let dvc = vc as? DetailViewController
        {
            var g = dvc.guide
            return g
        }
        return nil
    }
*/
    
    var isShowingClimbs : Bool { return searchBar.selectedScopeButtonIndex == 1 }
    
    override func viewDidLoad()
    {
        super.viewDidLoad()


        self.clearsSelectionOnViewWillAppear = false


        
    }
    
    override func viewWillAppear(animated: Bool)
    {
        self.searchBar.delegate = self
        
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

    // MARK: - Table view data source

    override func numberOfSectionsInTableView(tableView: UITableView) -> Int
    {
        if isShowingClimbs
        {
            if let guide = guide
            {
                
            }
        }
        return 1
    }

    override func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int
    {
        if let guide = guide
        {
            if isShowingClimbs
            {
                
            }
            else
            {
                return guide.headings.count
            }
        }
        
        return 0
    }

    
    override func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell
    {
        let cell = tableView.dequeueReusableCellWithIdentifier("Cell", forIndexPath: indexPath) as UITableViewCell

        // Configure the cell...
        if let guide = guide
        {
            if isShowingClimbs
            {
                
            }
            else
            {
                if let tn = guide.headings.get(indexPath.row)
                {
                    cell.textLabel.text = tn.value
                }
            }
        }

        return cell
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?) {
        // Get the new view controller using [segue destinationViewController].
        // Pass the selected object to the new view controller.
    }
    */
    
    // MARK: - Search bar delegate
    
    // called when text changes (including clear)
    func searchBar(searchBar: UISearchBar, textDidChange searchText: String)
    {
        
    }
    
    /// called when keyboard search button pressed
    func searchBarSearchButtonClicked(searchBar: UISearchBar)
    {
        
    }
    
    /// called when cancel button pressed
    func searchBarCancelButtonClicked(searchBar: UISearchBar)
    {
        //var vc = self.popoverPresentationController?.presentingViewController
        //vc?.dismissViewControllerAnimated(true, nil)
        
        dismissViewControllerAnimated(true, nil)
    }
    
    func searchBar(searchBar: UISearchBar, selectedScopeButtonIndexDidChange selectedScope: Int)
    {
        
    }

}
