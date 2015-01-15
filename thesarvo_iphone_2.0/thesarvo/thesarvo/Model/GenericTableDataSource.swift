//
//  GenericTableDataSource.swift
//  thesarvo
//
//  Created by Jon Nermut on 4/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import Foundation
import UIKit

class Row<T>
{
    var text: String?
    var getText: () -> (String)
    var model: T?
    
    init(modelObject: T)
    {
        self.model = modelObject
        
        self.getText = {
            if let m = self.model
            {
                return "\(m)"
            }
            if let t = self.text
            {
                return t
            }
            return ""
        }
    }
    
    init(text: String)
    {
        self.text = text
        self.getText =
        {
            if let t = self.text
            {
                return t
            }
            if let m = self.model
            {
                return "\(m)"
            }
            return ""
        }
    }
}

class Section<T, R>
{
    var header: String = ""
    var footer: String = ""
    var model: T?
    var rows: [Row<R>] = []
    
    init(header: String)
    {
        self.header = header
    }
    
    init(header: String, modelObject: T)
    {
        self.header = header
        self.model = modelObject
    }
}

class GenericTableDataSource<S,R> : NSObject, UITableViewDataSource
{
    var sections : [Section<S,R>] = []
    var reuseIdentifier = "Cell"
    
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int
    {
        if let s = sections.get(section)
        {
            return s.rows.count
        }
        return 0
    }
    
    func getRow(indexPath: NSIndexPath) -> Row<R>?
    {
        if let section = sections.get(indexPath.section)
        {
            return section.rows.get(indexPath.row)
        }
        return nil
    }
    
    func populateCell(cell: UITableViewCell, row: Row<R>)
    {
        cell.textLabel.text = row.getText()
    }
    
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell
    {
        var row = getRow(indexPath)
        var identifier = reuseIdentifier
        let cell = tableView.dequeueReusableCellWithIdentifier("Cell", forIndexPath: indexPath) as UITableViewCell
        
        if let row = row
        {
            populateCell(cell, row: row)
        }
        
        return cell
    }
    
    func numberOfSectionsInTableView(tableView: UITableView) -> Int
    {
        return sections.count
    }
    
    func tableView(tableView: UITableView, titleForHeaderInSection section: Int) -> String?
    {
        if let s = sections.get(section)
        {
            return s.header
        }
        return ""
    }
    
    func tableView(tableView: UITableView, titleForFooterInSection section: Int) -> String?
    {
        if let s = sections.get(section)
        {
            return s.footer
        }
        return ""
    }
}



class SingleSectionDataSource<R> : GenericTableDataSource<String,R>
{
    override init()
    {
        super.init()
        sections = [ Section(header: "") ]
    }
    
    var rows : [Row<R>] { return sections[0].rows }
}




