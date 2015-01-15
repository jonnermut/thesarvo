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

class MasterViewController: UITableViewController
{

    var detailViewController: DetailViewController? = nil
    
    var data : View?

    override func awakeFromNib() {
        super.awakeFromNib()
        if UIDevice.currentDevice().userInterfaceIdiom == .Pad {
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

        
        if let split = self.splitViewController
        {
            let controllers = split.viewControllers
            self.detailViewController = controllers[controllers.count-1].topViewController as? DetailViewController
        }
        
        
    }
    
    override func viewWillAppear(animated: Bool)
    {
        if (data == nil)
        {
            data = Model.instance.rootView
        }
        
        self.navigationItem.title = data?.text
        
        
        
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }



    // MARK: - Segues

    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?)
    {
        let dest: UIViewController = segue.destinationViewController as UIViewController
        
        if (sender is SegueCallback)
        {
            (sender as SegueCallback).function(dest)
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

    // MARK: - Table View

    override func numberOfSectionsInTableView(tableView: UITableView) -> Int {
        return 1
    }

    override func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int
    {
        if let data = data
        {
            return data.listItems.count
        }
        return 0
    }

    override func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        
        let cell = tableView.dequeueReusableCellWithIdentifier("Cell", forIndexPath: indexPath) as UITableViewCell

        let li = data?.listItems[indexPath.row]
        if let li = li
        {
            cell.textLabel.text = li.text

            cell.accessoryType = li.viewId != nil ? UITableViewCellAccessoryType.DisclosureIndicator : UITableViewCellAccessoryType.None;
            cell.textLabel.adjustsFontSizeToFitWidth = true
            var level = 0
            if let l = li.level
            {
                level = l-1
            }

            cell.textLabel.font = UIFont.systemFontOfSize( CGFloat(18-level*2) );
            cell.indentationLevel = level;
            
            cell.indentationWidth = 25;
        }
        
        return cell
    }

    func segueToDrilldown(viewId: String)
    {
        let callback = SegueCallback
        {
            (vc: UIViewController) in
            let mtvc = vc as MasterViewController
            var v = Model.instance.views[viewId]
            mtvc.data = v
        }
        
        self.performSegueWithIdentifier("showMaster", sender: callback)
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
                let callback = SegueCallback
                {
                    (vc: UIViewController) in
                    if let fcvc = DetailViewController.getFromVC(vc)
                    {
                        fcvc.viewId = viewId
                        fcvc.navigationItem.title = selected.text
                        //AppDelegate.instance().setupSplitViewButtons()
//                        if let splitView = AppDelegate.instance().splitViewController
//                        {
//                            //fcvc.navigationItem.rightBarButtonItem = splitView.displayModeButtonItem()
//                            fcvc.navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.Search, target: nil, action: nil)
//                        }
                    }
                }
                
                self.performSegueWithIdentifier("showDetail", sender: callback)

            }
            else
            {
                segueToDrilldown(viewId)
            }
        }
        


        

        
    }
    
    override func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath)
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

