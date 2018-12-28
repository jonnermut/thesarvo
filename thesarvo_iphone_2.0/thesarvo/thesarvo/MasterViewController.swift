//
//  MasterViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import UIKit
fileprivate func < <T : Comparable>(lhs: T?, rhs: T?) -> Bool {
  switch (lhs, rhs) {
  case let (l?, r?):
    return l < r
  case (nil, _?):
    return true
  default:
    return false
  }
}

fileprivate func > <T : Comparable>(lhs: T?, rhs: T?) -> Bool {
  switch (lhs, rhs) {
  case let (l?, r?):
    return l > r
  default:
    return rhs < lhs
  }
}


class SegueCallback
{
    let function : (UIViewController) -> ()
    init (_ function: @escaping (UIViewController) -> () )
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
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?)
    {
        super.init(style: UITableViewCell.CellStyle.subtitle, reuseIdentifier: reuseIdentifier)
    }

    required init?(coder aDecoder: NSCoder)
    {
        super.init(coder: aDecoder)
    }
}

class ShowClimbsCell: UITableViewCell
{
    weak var parent: MasterViewController? = nil

    @IBOutlet weak var climbSwitch: UISwitch!

    @IBAction func switchValueChanged(_ sender: Any)
    {
        Model.instance.showClimbsInTOC = climbSwitch.isOn
        parent?.setupDatasource()
    }
}

class MasterViewController: UITableViewController, UISearchResultsUpdating, UISearchBarDelegate
{
    var guide: Guide?
    //var showingTOC: Bool { return self.guide != nil }
    
    var detailViewController: DetailViewController? = nil
    
    //var data : View?
    
    var searchController: UISearchController!
    var searchBar: UISearchBar!
    
    var searchString: String?
    var searchScope: Int? = nil
    
    var mainDataSource: TableViewDataSource?
    var sectionedDatasource: SectionedDataSource<Any>? = nil
    
    @IBOutlet var updateView: UIView!
    @IBOutlet var progressView: UIProgressView!
    @IBOutlet var updateLabel: UILabel!
    
    //@IBOutlet weak var showClimbsCell: ShowClimbsCell?

    var searching = false
    var searchAgain = false
    
    var updateTimer: Timer? = nil
    
    static var last: MasterViewController? = nil

    override func awakeFromNib()
    {
        super.awakeFromNib()
        if UIDevice.current.userInterfaceIdiom == .pad
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
        
        if (guide == nil)
        {
            guide = Model.instance.rootGuide
            //navigateToDetail("guide.9404494", title: "Introduction", elementId: nil, showDetail: false)
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

        if let t = guide?.title
        {
            self.navigationItem.title = t
        }
        self.setupSearchBar()

        self.tableView.allowsMultipleSelection = false
    }

    func setupSearchBar()
    {
        searchController = UISearchController(searchResultsController: nil)
        searchBar = searchController.searchBar
        searchController.searchResultsUpdater = self;
        searchBar.delegate = self
        searchController.dimsBackgroundDuringPresentation = false;

        searchBar.placeholder = "Search for crag, climb, grade, ***"
        var titles: [String] = []
        let content = guide?.hasGuideContent ?? false
        if content
        {
            titles = ["This page", "All"]
            searchBar.placeholder = "Search"
        }
        searchBar.scopeButtonTitles = titles
        searchBar.isOpaque = true
        searchBar.sizeToFit()

        searchBar.backgroundColor = UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1)

        self.definesPresentationContext = true;
        self.tableView.tableHeaderView = self.searchController.searchBar;
        self.tableView.tableHeaderView?.isOpaque = true
    }
    
    @objc dynamic func updateUpdateView()
    {
        self.updateView.isHidden = false
        let gd = Model.instance.guideDownloader
        
        self.updateLabel.text = gd.labelText
        
        if (gd.syncing)
        {
            self.progressView.isHidden = false
            self.progressView.progress = gd.progress
        }
        else
        {
            self.progressView.isHidden = true
        }
    }
    
    override func viewWillAppear(_ animated: Bool)
    {
        super.viewWillAppear(animated)
        
        MasterViewController.last = self



        
//        if (data != nil && data?.text != nil)
//        {
//             self.navigationItem.title = data?.text
//        }
        
        if (guide == nil)
        {
            guide = Model.instance.rootGuide
        }

        
        if (mainDataSource == nil)
        {
            setupDatasource()
        }
        
        
        if guide === Model.instance.rootGuide
        {
            updateUpdateView()
            updateTimer = Timer.scheduledTimer(timeInterval: 1.0, target: self, selector: #selector(MasterViewController.updateUpdateView), userInfo: nil, repeats: true)
            
        }
        else
        {
            Model.instance.lastPath = self.navigationController?.viewControllers
                .compactMap { ($0 as? MasterViewController)?.guide?.viewIdOrId }
        }
        
    }
    
    override func viewWillDisappear(_ animated: Bool)
    {
        super.viewWillDisappear(animated)
        if let ut = updateTimer
        {
            ut.invalidate()
        }
        self.updateTimer = nil
    }
    

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func setupDatasource()
    {
        let showClimbsCell = self.tableView.dequeueReusableCell(withIdentifier: "ShowClimbsCell") as? ShowClimbsCell
        showClimbsCell?.climbSwitch.isOn = Model.instance.showClimbsInTOC

        runInBackground()
        {
            guard let guide = self.guide else { return }

            let filter = self.searchString

            // sectioned by header then climb
            var tocRows = guide.getHeadingsAndClimbs()

            let hasClimbs = tocRows.contains(where: { $0 is ClimbNode })

            let hasFilter = filter != nil && filter?.count > 1

            if let filter = filter, hasFilter
            {
                tocRows = tocRows.filter()
                {
                    (guideNode: GuideNode) in
                    (guideNode.searchString ?? "").containsCaseInsensitive(filter)
                }
            }
            else if !Model.instance.showClimbsInTOC && hasClimbs
            {
                tocRows = tocRows.filter
                {
                    !($0 is ClimbNode)
                }
            }


            let d = SectionedDataSource<Any>()
            let settingsSection = Section<Any>(header: "")

            if hasClimbs && !hasFilter
            {
                if let sc = showClimbsCell
                {
                    sc.parent = self
                    settingsSection.rows.append(sc)
                }
                d.sections.append(settingsSection)
            }

            let tocSection = Section<Any>(rows: tocRows)
            tocSection.defaultCellIdentifier = "TOCCell"
            d.sections.append(tocSection)
            d.defaultCellIdentifier = "TOCCell"

            if guide.hasChildren
            {
                let tocSection = Section<Any>(rows: guide.children)
                tocSection.defaultCellIdentifier = "Cell"
                d.sections.append(tocSection)
            }

            d.cellConfigurator = self.configureCell


            runOnMain()
            {
                self.mainDataSource = d.tableViewDataSource
                self.sectionedDatasource = d

                //self.tableView.rowHeight = 32
                self.tableView.dataSource = self.mainDataSource
                self.tableView.reloadData()
            }
        }


    }

    /*
    func setupDatasource()
    {
        guard let guide = guide else { return }

        if guide.hasGuideContent 
        {
            setupTOCDatasource()
            return
        }

        
        let rows = guide.children 
        let d = SingleSectionDataSource(rows: rows)
        d.cellConfigurator = self.configureGuideCell

        self.mainDataSource = d.tableViewDataSource
        self.tableView.dataSource = mainDataSource
        self.tableView.reloadData()
    }
 */
    func configureCell(cell: UITableViewCell?, val: Any)
    {
        if let guide = val as? Guide
        {
            self.configureGuideCell(cell: cell, li: guide)
        }
        else if let node = val as? GuideNode
        {
            if let cell = cell as? TOCCell
            {
                cell.node = node
                cell.textLabel?.text = node.description
                cell.textLabel?.adjustsFontSizeToFitWidth = true

                cell.backgroundColor = UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1)

                cell.selectedBackgroundView = UIView()
                cell.selectedBackgroundView?.backgroundColor = UIColor(red: 0, green: 0, blue: 0.5, alpha: 0.8)

                if let tn = node as? TextNode
                {
                    if tn.clazz == "heading2" || tn.clazz == "heading1"
                    {
                        cell.textLabel?.font = UIFont.boldSystemFont(ofSize: 14)
                        cell.indentationLevel = 0
                    }
                    else
                    {
                        cell.textLabel?.font = UIFont.boldSystemFont(ofSize: 13)
                        cell.indentationLevel = 1

                    }
                }
                else if node is HeaderNode || node is GpsNode
                {
                    cell.textLabel?.font = UIFont.boldSystemFont(ofSize: 14)
                    cell.indentationLevel = 0
                }
                else
                {
                    cell.textLabel?.font = UIFont.systemFont(ofSize: 13)
                    cell.indentationLevel = 3
                    cell.backgroundColor = UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)
                }
            }
        }
    }

    func configureGuideCell(cell: UITableViewCell?, li: Guide)
    {
        cell?.textLabel?.text = li.title
        cell?.accessoryType = UITableViewCell.AccessoryType.disclosureIndicator 
        cell?.textLabel?.adjustsFontSizeToFitWidth = true
        let level = (li.level ?? 1) - 1

        cell?.textLabel?.font = UIFont.systemFont( ofSize: CGFloat(18-level*2) );
        cell?.indentationLevel = level;
        cell?.indentationWidth = 25;
        cell?.backgroundColor = UIColor.clear
        cell?.selectedBackgroundView = UIView()
        cell?.selectedBackgroundView?.backgroundColor = UIColor(red: 0, green: 0, blue: 0.5, alpha: 0.8)
    }


    // MARK: - Segues

    override func prepare(for segue: UIStoryboardSegue, sender: Any?)
    {
        let dest: UIViewController = segue.destination as UIViewController
        
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

    
    func segueToDrilldown(_ guide: Guide)
    {
        let callback = SegueCallback
        {
            (vc: UIViewController) in
            let mtvc = vc as! MasterViewController
            mtvc.guide = guide
            mtvc.navigationItem.title = guide.title
        }
        
        self.performSegue(withIdentifier: "showMaster", sender: callback)
    }
    
    func navigateToDetail(_ viewId: String, title: String?, elementId: String? = nil, showDetail: Bool = true)
    {
        let vid = viewId.removePrefixIfPresent("guide.")
        var guide: Guide? = nil
        if (!vid.hasPrefix("http.") && vid.count > 0)
        {
            //guide = Guide(id: vid)
            guide = Model.instance.getGuide(viewId, name: nil)
        }
        let hasToc = (guide?.getHeadingsAndClimbs().count > 0)
        
        let fcvc = self.storyboard?.instantiateViewController(withIdentifier: "detailViewController") as! DetailViewController
        fcvc.guide = guide
        fcvc.viewId = viewId
        fcvc.navigationItem.title = title
        if let el = elementId
        {
            fcvc.elemendId = el
        }
        AppDelegate.instance().setDetail(fcvc, showNow: showDetail)
        
        //var delay = 0.0
        if let g = guide
        {
            //delay = 0.2
            let ddcallback = SegueCallback
            {
                (vc: UIViewController) in
                let mtvc = vc as! MasterViewController
                mtvc.guide = g
                let t = title ?? ""
                mtvc.navigationItem.title = "\(t)"
            }
            
            runInBackground()
            {
                if (hasToc)
                {
                    runOnMain()
                    {
                        self.performSegue(withIdentifier: "showMaster", sender: ddcallback)
                    }
                }
            }
        }
        
        /*
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
*/
    }
    

    
    
    fileprivate func showMap(guide: Guide? = nil)
    {
        let mc = self.storyboard?.instantiateViewController(withIdentifier: "mapController") as! MapViewController
        if let g = guide
        {
            mc.guide = g
        }
        AppDelegate.instance().setDetail(mc)
    }

    func childSelected(_ selected: Guide)
    {
        if let viewId = selected.viewId
        {
            if (viewId == "Map")
            {
                /*
                let callback = SegueCallback
                {
                    (vc: UIViewController) in
                }
                self.performSegueWithIdentifier("showMap", sender: callback)
*/
                if !Model.instance.indexingDone
                {
                    return
                }
                
                showMap()

            }
            else if (viewId == "Settings")
            {
                let sc = self.storyboard?.instantiateViewController(withIdentifier: "settingsController") as! SettingsViewController
                AppDelegate.instance().setDetail(sc)
            }
            else if (viewId.hasPrefix("guide.") || viewId.hasPrefix("http"))
            {
                navigateToDetail(viewId, title: selected.title)

            }
            else if selected.hasChildren
            {
                segueToDrilldown(selected)
            }

        }
        else
        {
            let hasToc = selected.getHeadingsAndClimbs().count > 0
            //let hasGuideContent = selected.hasGuideContent
            if selected.hasChildren
            {
                segueToDrilldown(selected)
            }
            else
            {
                let showNow = !hasToc
                navigateToDetail("\(selected.id)", title: selected.title, elementId: nil, showDetail: showNow)
            }
        }
        
    }
    
    override func tableView(_ tableView: UITableView, didDeselectRowAt indexPath: IndexPath)
    {
        
        // I don't know why exactly, but this hammer seems essential 
        // to clearing the previous selection, which is doing a lot of extra work, but buggered if I can get it to clear otherwise
        //tableView.reloadData()
        
    }
    
    func navigateToEntry(_ entry: IndexEntry)
    {
        let elementId = entry.node?.elementId
        navigateToDetail("\(entry.guide.id)", title: entry.guide.title, elementId: elementId)

    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath)
    {
        guard let guide = guide else { return }
        guard let ds = sectionedDatasource else { return }
        let val = ds.getRow(indexPath)

        let cell = tableView.dataSource?.tableView(tableView, cellForRowAt: indexPath)
        
        if let searchCell = cell as? SearchCell
        {
            if let entry = searchCell.indexEntry
            {
                self.navigateToEntry(entry)
            }
        }
        else if let node = val as? GuideNode
        {
            if node is GpsNode
            {
                self.showMap(guide: guide)
            }
            else if let dvc = AppDelegate.instance().getDetail() as? DetailViewController, dvc.guide === self.guide
            {
                dvc.scrollToId(node.elementId)
                AppDelegate.instance().hideMasterIfNecessary()
            }
            else
            {
                navigateToDetail("\(guide.id)", title: guide.title, elementId: node.elementId, showDetail: true)
            }
        }
        else if let child = val as? Guide
        {
            childSelected(child)
        }
    }

    public func searchBar(_ searchBar: UISearchBar, selectedScopeButtonIndexDidChange selectedScope: Int)
    {
        updateSearchResults(for: searchController)
    }

    public func updateSearchResults(for searchController: UISearchController)
    {
        searchString = searchController.searchBar.text
        searchScope = searchController.searchBar.selectedScopeButtonIndex
        updateSearchResults()
    }

    var searchThisPageOnly: Bool
    {
        return guide?.hasGuideContent ?? false && searchScope == 0
    }

    func updateSearchResults()
    {
        if searchThisPageOnly
        {
            setupDatasource()
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
        
        if (searchString == nil || searchString!.count < 2)
        {
            self.setupDatasource()
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
                    (cell: UITableViewCell?, entry: IndexEntry) in
                    if let c = cell as? SearchCell
                    {
                        c.indexEntry = entry
                    }
                    
                    guard let cell = cell else { return }
                    
                    cell.textLabel?.text = entry.searchString.ltrimmed()
                    
                    cell.accessoryType = .none
                    cell.textLabel?.adjustsFontSizeToFitWidth = true
                    cell.textLabel?.font = UIFont.boldSystemFont(ofSize: 14)
                    
                    cell.indentationLevel = 0
                    
                    cell.backgroundColor = nil
                    
                    if entry.node != nil
                    {
                        cell.detailTextLabel?.text = entry.guide.title ?? ""
                    }
                    else
                    {
                        cell.detailTextLabel?.text = ""
                    }
                    
                }
                searchDataSource.defaultCellIdentifier = "SearchCell"
                
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


