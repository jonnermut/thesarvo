//
//  PageSearchTableViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 3/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import UIKit

// static to remember last selected scope
var lastScope : Int = 0

class PageSearchTableViewController: UITableViewController, UISearchBarDelegate
{
    
    @IBOutlet weak var searchBar: UISearchBar?
    
    var guide: Guide?
    {
        didSet { setupDatasource() }
    }
    var datasource: SectionedDataSource<GuideNode>?
    
    var detailViewController : DetailViewController?
    
    var filter : String { return (searchBar?.text).valueOr("").lowercaseString.trimmed() }
    var shouldFilter : Bool { return (filter.length >= 2) }
    
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
    
    var isShowingClimbs : Bool { return searchBar?.selectedScopeButtonIndex == 1 }
    
    override func viewDidLoad()
    {
        super.viewDidLoad()
        self.clearsSelectionOnViewWillAppear = false
    }
    
    override func viewWillAppear(animated: Bool)
    {
        self.searchBar?.delegate = self
        
        self.searchBar?.selectedScopeButtonIndex = lastScope
        
        setupDatasource()
        
    }

    func setupDatasource()
    {
        if let guide = guide
        {
            var filter = self.filter
            if self.isShowingClimbs
            {
                // sectioned by header then climb
                let d = guide.getHeadingsAndClimbs()
                self.datasource = d
            }
            else
            {
                // headers only
                let d = SingleSectionDataSource<GuideNode>()
                d.rows = guide.headings
                if shouldFilter
                {
                    d.rows = d.rows.filter( { $0.value.containsCaseInsensitive(filter) } )
                }
                self.datasource = d
            }
            
            self.tableView.dataSource = datasource?.tableViewDataSource
            self.tableView.reloadData()
        }

    }

    override func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath)
    {
        if let node = datasource?.getRow(indexPath)
        {
            detailViewController?.scrollToId(node.elementId)
            dismissViewControllerAnimated(true, nil)
        }
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
        setupDatasource()
    }
    
    /// called when keyboard search button pressed
    func searchBarSearchButtonClicked(searchBar: UISearchBar)
    {
        setupDatasource()
    }
    
    /// called when cancel button pressed
    func searchBarCancelButtonClicked(searchBar: UISearchBar)
    {
        dismissViewControllerAnimated(true, nil)
    }
    
    func searchBar(searchBar: UISearchBar, selectedScopeButtonIndexDidChange selectedScope: Int)
    {
        lastScope = selectedScope
        setupDatasource()
    }

}
