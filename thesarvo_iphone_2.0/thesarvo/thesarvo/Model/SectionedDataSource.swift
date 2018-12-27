//
//  GenericTableDataSource.swift
//  thesarvo
//
//  Created by Jon Nermut on 4/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation
import UIKit

/* Usage example


    // Some array of model objects
    var rows : Array<MyModel>

    // our generic datasource
    var ds = SingleSectionDataSource<MyModel> ( rows )
    {

        cell: UITableViewCell!, row: MyModel in

        // cell configurator - set the properties of the cell based on the model. For eg.
        cell?.textLabel.text = row.name
    }

    // plumb the datasource into the table view
    self.tableView.datasource = ds.tableViewDataSource

*/


/**
 * Represents a section with row datatype R
 */
class Section<R>
{
    var header: String = ""
    var footer: String = ""
    var value: Any?
    var rows: [R] = []
    var defaultCellIdentifier: String? = nil

    init(header: String)
    {
        self.header = header
    }
    
    init(header: String, value: Any?)
    {
        self.header = header
        self.value = value
    }

    init(rows: [R])
    {
       self.rows = rows
    }
}

/**
* Allows the UITableViewDataSource to talk to our datasource without knowing the underlying type is generic (which is against the rules for Obj-C objects)
*/
protocol SectionedDataSourceBridge
{
    func numberOfSections() -> Int
    
    func numberOfRowsInSection(_ section: Int) -> Int
    
    func cellForRowAtIndexPath(_ tableView: UITableView, indexPath: IndexPath) -> UITableViewCell
    
    func titleForHeaderInSection(_ section: Int) -> String?
    
    func titleForFooterInSection(_ section: Int) -> String?
}

/**
* Represents a data source with arbitary sections with row type R.
* Use the tableViewDataSource property to feed this to a UITableView.
* Use the cellConfigurator or rowToString callbacks to configure the UITableViewCell.
*/
class SectionedDataSource<R> : SectionedDataSourceBridge
{
    typealias RowToString = (R) -> (String)
    typealias CellConfigurator = (UITableViewCell?, R) -> (Void)
    var sections : [Section<R>] = []
    var defaultCellIdentifier = "Cell"
    
    var rowToString : RowToString = {
        r in
        return "\(r)"
    }
    
    var cellConfigurator : CellConfigurator = {
        cell, row in
    }
    
    lazy var tableViewDataSource : TableViewDataSource = TableViewDataSource(sectionedDataSource: self)

    
    init()
    {
        self.cellConfigurator = {
            cell, row in
            if let label = cell?.textLabel
            {
                label.text = self.rowToString(row)
            }
        }

    }
    
    init( sections : [Section<R>], cellConfigurator: @escaping CellConfigurator)
    {
        self.sections = sections
        self.cellConfigurator = cellConfigurator
    }
    


    func getRow(_ row: Int, section : Int = 0) -> R?
    {
        if let section = sections.get(section)
        {
            return section.rows.get(row)
        }
        return nil
    }
    
    func getRow(_ indexPath: IndexPath) -> R?
    {
        return getRow((indexPath as NSIndexPath).row, section: (indexPath as NSIndexPath).section)
    }
    
    func populateCell(_ cell: UITableViewCell, row: R)
    {
        cellConfigurator(cell, row)
    }
    

    func numberOfSections() -> Int
    {
        return sections.count
    }

    func numberOfRowsInSection(_ section: Int) -> Int
    {
        if let s = sections.get(section)
        {
            return s.rows.count
        }
        return 0
    }

    func cellReuseIdentifier(indexPath: IndexPath) -> String
    {
        let identifier = sections.get(indexPath.section)?.defaultCellIdentifier ?? self.defaultCellIdentifier

        return identifier
    }
    
    func cellForRowAtIndexPath(_ tableView: UITableView, indexPath: IndexPath) -> UITableViewCell
    {
        let row = getRow(indexPath)
        let identifier = defaultCellIdentifier

        var cell: UITableViewCell
        if let r = row as? UITableViewCell
        {
            cell = r
        }
        else
        {
            cell = tableView.dequeueReusableCell(withIdentifier: identifier) ?? UITableViewCell()
        }

        
        if let row = row
        {
            populateCell(cell, row: row)
        }
        
        return cell
        
    }
    
    
    func titleForHeaderInSection(_ section: Int) -> String?
    {
        if let s = sections.get(section)
        {
            return s.header
        }
        return ""
    }
    
    func titleForFooterInSection(_ section: Int) -> String?
    {
        if let s = sections.get(section)
        {
            return s.footer
        }
        return ""
    }
}

/**
 * A non generic helper class which can be given to a UITableView as its datasource
 */
class TableViewDataSource : NSObject, UITableViewDataSource
{
    var sectionedDataSource : SectionedDataSourceBridge
    
    init (sectionedDataSource : SectionedDataSourceBridge)
    {
        self.sectionedDataSource = sectionedDataSource
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int
    {
        return sectionedDataSource.numberOfRowsInSection(section)
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell
    {
        return sectionedDataSource.cellForRowAtIndexPath(tableView, indexPath: indexPath)
    }
    
    func numberOfSections(in tableView: UITableView) -> Int
    {
        return sectionedDataSource.numberOfSections()
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String?
    {
        return sectionedDataSource.titleForHeaderInSection(section)
    }
    
    func tableView(_ tableView: UITableView, titleForFooterInSection section: Int) -> String?
    {
        return sectionedDataSource.titleForFooterInSection(section)
    }
}


/**
 * A specialisation of SectionedDataSource which only has one section, and so exposes a rows property directly.
 */
class SingleSectionDataSource<R> : SectionedDataSource<R>
{
    override init()
    {
        super.init()
        sections = [ Section(header: "") ]
    }
    
    convenience init( rows : [R])
    {
        self.init()
        self.rows = rows
    }
    
    convenience init( rows : [R], cellConfigurator: @escaping CellConfigurator)
    {
        self.init(rows: rows)
        self.cellConfigurator = cellConfigurator
    }
    
    var rows : [R]
    {
        get { return sections[0].rows }
        set { sections[0].rows = newValue }
    }
    
}




