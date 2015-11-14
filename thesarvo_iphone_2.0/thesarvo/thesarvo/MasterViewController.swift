//
//  MasterViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import UIKit

class SegueCallback
{
    let function : (UIViewController) -> ()
    init (_ function: (UIViewController) -> () )
    {
        self.function = function
    }
}

class TOCCell: UITableViewCell
{
    var node: GuideNode?
}

class SearchCell: UITableViewCell
{
    var indexEntry: IndexEntry?
    
    override init(style: UITableViewCellStyle, reuseIdentifier: String?)
    {
        super.init(style: UITableViewCellStyle.Subtitle, reuseIdentifier: reuseIdentifier)
    }

    required init?(coder aDecoder: NSCoder)
    {
        super.init(coder: aDecoder)
    }
}

class MasterViewController: UITableViewController, UISearchResultsUpdating
{
    var guide: Guide?
    var showingTOC: Bool { return self.guide != nil }
    
    var detailViewController: DetailViewController? = nil
    
    var data : View?
    
    var searchController: UISearchController!
    
    var searchString: String?
    
    var mainDataSource: TableViewDataSource?
    
    
    var searching = false
    var searchAgain = false

    override func awakeFromNib()
    {
        super.awakeFromNib()
        if UIDevice.currentDevice().userInterfaceIdiom == .Pad
        {
            self.clearsSelectionOnViewWillAppear = false
            self.preferredContentSize = CGSize(width: 320.0, height: 600.0)
        }
    }

    override func viewDidLoad()
    {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        /*
        self.navigationItem.leftBarButtonItem = self.editButtonItem()

        let addButton = UIBarButtonItem(barButtonSystemItem: .Add, target: self, action: "insertNewObject:")
        self.navigationItem.rightBarButtonItem = addButton
        */
        
        if (data == nil)
        {
            data = Model.instance.rootView
        }

        /* FIXME
        if let split = self.splitViewController
        {
            let controllers = split.viewControllers
            self.detailViewController = controllers[controllers.count-1].topViewController as? DetailViewController
        }
        */
        
        //self.tableView.registerClass(SearchCell.self, forCellReuseIdentifier: "SearchCell")
        //self.tableView.registerClass(TOCCell.self, forCellReuseIdentifier: "TOCCell")
        
        searchController = UISearchController(searchResultsController: nil)
        self.searchController.searchResultsUpdater = self;
        self.searchController.dimsBackgroundDuringPresentation = false;
        //self.searchController.searchBar.scopeButtonTitles = @[NSLocalizedString(@"ScopeButtonCountry",@"Country"),NSLocalizedString(@"ScopeButtonCapital",@"Capital")];
        //self.searchController.searchBar.delegate = self;
        self.tableView.tableHeaderView = self.searchController.searchBar;
        self.definesPresentationContext = true;
        self.searchController.searchBar.sizeToFit()
        self.searchController.searchBar.placeholder = "Search for crag, climb, grade, ***"
        if showingTOC
        {
            self.searchController.searchBar.placeholder = "Search within page"
        }
        self.searchController.searchBar.backgroundColor = UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1)
    }
    
    override func viewWillAppear(animated: Bool)
    {
        if (data == nil)
        {
            data = Model.instance.rootView
        }
        
        self.navigationItem.title = data?.text
        
        if (mainDataSource == nil)
        {
            setupDatasource()
        }
        
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func setupTOCDatasource()
    {
        if let guide = guide
        {
            let filter = self.searchString

            // sectioned by header then climb
            let d = guide.getHeadingsAndClimbs()
            d.reuseIdentifier = "TOCCell"
            
            if let filter = filter
            {
                if filter.characters.count > 0
                {
                    d.rows = d.rows.filter()
                    {
                        (guideNode: GuideNode) in
                        (guideNode.searchString ?? "").containsCaseInsensitive(filter)
                    }
                }
            }
            
            d.cellConfigurator =
            {
                (cell: UITableViewCell!, node: GuideNode) in
                if let cell = cell as? TOCCell
                {
                    cell.node = node
                    cell.textLabel?.text = node.description
                    cell.textLabel?.adjustsFontSizeToFitWidth = true
                    
                    if (node is TextNode)
                    {
                        cell.textLabel?.font = UIFont.boldSystemFontOfSize(14)
                        cell.indentationLevel = 0
                        cell.backgroundColor = UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1)
                    }
                    else
                    {
                        cell.textLabel?.font = UIFont.systemFontOfSize(13)
                        cell.indentationLevel = 3
                        cell.backgroundColor = UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)
                    }

                }
            }
            /*
            if (shouldFilter)
            {
                for sect in d.sections
                {
                    sect.rows = sect.rows.filter()
                        {
                            (guideNode: GuideNode) in
                            (guideNode.searchString ?? "").containsCaseInsensitive(filter)
                    }
                }
            }
            */
            self.tableView.rowHeight = 32
            self.mainDataSource = d.tableViewDataSource
            self.tableView.dataSource = mainDataSource
            self.tableView.reloadData()
        }

    }

    func setupDatasource()
    {
        if guide != nil
        {
            setupTOCDatasource()
            return
        }
        
        let rows = (data?.listItems).valueOr([])
        let d = SingleSectionDataSource(rows: rows)
        {
            cell, li in

            cell.textLabel?.text = li.text
            cell.accessoryType = li.viewId != nil ? UITableViewCellAccessoryType.DisclosureIndicator : UITableViewCellAccessoryType.None;
            cell.textLabel?.adjustsFontSizeToFitWidth = true
            var level = 0
            if let l = li.level
            {
                level = l-1
            }
            
            cell.textLabel?.font = UIFont.systemFontOfSize( CGFloat(18-level*2) );
            cell.indentationLevel = level;
            cell.indentationWidth = 25;
        }
        self.mainDataSource = d.tableViewDataSource
        self.tableView.dataSource = mainDataSource
        self.tableView.reloadData()
    }


    // MARK: - Segues

    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?)
    {
        let dest: UIViewController = segue.destinationViewController as UIViewController
        
        if (sender is SegueCallback)
        {
            (sender as! SegueCallback).function(dest)
        }
        
        /*
        if segue.identifier == "showDetail"
        {
            if let indexPath = self.tableView.indexPathForSelectedRow()
            {
                let li = data?.listItems[indexPath.row]
                let controller = (segue.destinationViewController as UINavigationController).topViewController as DetailViewController
                
                if (li != nil)
                {
                    controller.viewId = li!.viewId
                }
                controller.navigationItem.leftBarButtonItem = self.splitViewController?.displayModeButtonItem()
                controller.navigationItem.leftItemsSupplementBackButton = true
            }
        }
*/
    }

    
    func segueToDrilldown(viewId: String)
    {
        let callback = SegueCallback
        {
            (vc: UIViewController) in
            let mtvc = vc as! MasterViewController
            var v = Model.instance.views[viewId]
            mtvc.data = v
        }
        
        self.performSegueWithIdentifier("showMaster", sender: callback)
    }
    
    func navigateToDetail(viewId: String, title: String?, elementId: String? = nil)
    {
        var vid = viewId.removePrefixIfPresent("guide.")
        var guide: Guide?
        if (!vid.hasPrefix("http.") && vid.characters.count > 0)
        {
            guide = Guide(guideId: vid)
        }
        
        let callback = SegueCallback
        {
            (vc: UIViewController) in
            if let fcvc = DetailViewController.getFromVC(vc)
            {
                fcvc.guide = guide
                fcvc.viewId = viewId
                fcvc.navigationItem.title = title
                if let el = elementId
                {
                    fcvc.elemendId = el
                }
            }
        }
        
        // drill down in the master to a TOC
        var delay = 0.0
        if let g = guide
        {
            delay = 0.2
            let ddcallback = SegueCallback
            {
                (vc: UIViewController) in
                let mtvc = vc as! MasterViewController
                mtvc.guide = g
                    
            }
            self.performSegueWithIdentifier("showMaster", sender: ddcallback)
        }
        
        runAfterDelay(delay)
        {
        
            AppDelegate.instance().hideMasterIfNecessary()
            self.performSegueWithIdentifier("showDetail", sender: callback)
        }
    }
    
    
    func childSelected(selected: ListItem)
    {
        if let viewId = selected.viewId
        {
            if (viewId == "Map")
            {
                let callback = SegueCallback
                {
                    (vc: UIViewController) in
                }
                self.performSegueWithIdentifier("showMap", sender: callback)
            }
            else if (viewId.hasPrefix("guide.") || viewId.hasPrefix("http"))
            {
                navigateToDetail(viewId, title: selected.text)

            }
            else
            {
                segueToDrilldown(viewId)
            }
        }
        
    }
    
    override func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath)
    {
        let cell = tableView.dataSource?.tableView(tableView, cellForRowAtIndexPath: indexPath)
        
        if let searchCell = cell as? SearchCell
        {
            if let entry = searchCell.indexEntry
            {
                let elementId = entry.node?.elementId
                navigateToDetail(entry.guide.guideId, title: entry.guide.name, elementId: elementId)
            }
        }
        else if let tocCell = cell as? TOCCell
        {
            if let node = tocCell.node
            {
                if let dvc = DetailViewController.last
                {
                    dvc.scrollToId(node.elementId)
                    AppDelegate.instance().hideMasterIfNecessary()
                }
            }
        }
        else
        {
            if (data?.listItems.count > indexPath.row)
            {
                if let c = data?.listItems[indexPath.row]
                {
                    childSelected(c)
                }
            }
        }
    }

    internal func updateSearchResultsForSearchController(searchController: UISearchController)
    {
        searchString = searchController.searchBar.text
        updateSearchResults()
    }

    func updateSearchResults()
    {
        if self.showingTOC
        {
            setupTOCDatasource()
            return
        }
        
        let model = Model.instance
        
        if (!model.indexingDone)
        {
            return
        }
        
        if (searching)
        {
            searchAgain = true
            return
        }
        
        if (searchString == nil || searchString!.characters.count < 2)
        {
            self.tableView.dataSource = mainDataSource
            self.tableView.reloadData()
            return
        }
        
        if let searchString = searchString
        {

            
            searching = true
            runInBackground()
            {
                let results = model.search(searchString)
                
                let searchDataSource = SingleSectionDataSource(rows: results)
                {
                    (cell: UITableViewCell!, entry: IndexEntry) in
                    if let c = cell as? SearchCell
                    {
                        c.indexEntry = entry
                    }
                    
                    cell.textLabel?.text = entry.searchString.ltrimmed()
                    
                    cell.accessoryType = .None
                    cell.textLabel?.adjustsFontSizeToFitWidth = true
                    cell.textLabel?.font = UIFont.boldSystemFontOfSize(14)
                    
                    cell.indentationLevel = 0
                    
                    if entry.node != nil
                    {
                        cell.detailTextLabel?.text = entry.guide.name ?? ""
                    }
                    else
                    {
                        cell.detailTextLabel?.text = ""
                    }
                    
                }
                searchDataSource.reuseIdentifier = "SearchCell"
                
                runOnMain()
                {
                    self.tableView.dataSource = searchDataSource.tableViewDataSource
                    self.tableView.reloadData()
                    
                    self.searching = false
                    if (self.searchAgain)
                    {
                        self.searchAgain = false
                        self.updateSearchResults()
                    }
                }
            }
        }
    }

}


