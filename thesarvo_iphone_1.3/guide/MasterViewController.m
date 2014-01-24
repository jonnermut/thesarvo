//
//  MasterViewController.m
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import "MasterViewController.h"

#import "DetailViewController.h"
#import "AppDelegate.h"
#import "IndexEntry.h"

@implementation MasterViewController 

@synthesize detailViewController = _detailViewController;
@synthesize data;
@synthesize searchDisplayController;
@synthesize searchResults;

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        self.title = @"thesarvo";
        if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPad) {
            self.clearsSelectionOnViewWillAppear = NO;
            self.contentSizeForViewInPopover = CGSizeMake(320.0, 600.0);
        }
    }
    return self;
}
							
- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Release any cached data, images, etc that aren't in use.
}

#pragma mark UISearchDisplayDelegate

- (BOOL)searchDisplayController:(UISearchDisplayController *)controller shouldReloadTableForSearchString:(NSString *)searchString
{
//    if (searchString && [searchString length] > 2)
//    {
//        return YES;
//    }
//    else
//    {
//        self.searchResults = nil;
//        return NO;
//    }
    
    if (searchString && [searchString length] > 1)
    {
        if (self.searching)
            self.searchAgain = YES;
        else
        {
            self.searching = YES;
            self.searchAgain = NO;
            
            dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                [self doSearch];
            });
        }
    }
    
    return NO;
}

- (void) doSearch
{
    self.searching = YES;
    NSString* searchTerm = self.searchDisplayController.searchBar.text;
    
    NSMutableArray* results = [NSMutableArray array];
    
    int matches = 0;
    NSDictionary* index = self.delegate.index;
    for (NSString* text in index)
    {
        NSRange range = [text rangeOfString:searchTerm options:NSCaseInsensitiveSearch];
        
        if (range.location != NSNotFound)
        {
            // match
            [results addObject: index[text]];
            matches++;
            
            if (matches < 13 || matches % 10 == 0 )
            {
                // update the results as we find them
                [self updateSearchResults: results withSearchTerm:searchTerm];
            }
        }
    }
    [self updateSearchResults: results withSearchTerm:searchTerm];
    
    if (self.searchAgain)
    {
        self.searchAgain = NO;
        [self doSearch];
    }
    
    self.searching = NO;
    self.searchAgain = NO;
    
}

- (void) updateSearchResults: (NSArray*) results withSearchTerm: (NSString*) term
{
    __block NSArray* resultsCopy = [NSArray arrayWithArray:results];
    dispatch_async(dispatch_get_main_queue(), ^{
        self.searchResults = resultsCopy;
        self.searchTerm = term;
        [self.searchDisplayController.searchResultsTableView reloadData ];
    });
}

#pragma mark - View lifecycle

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPad) {
        [self.tableView selectRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0] animated:NO scrollPosition:UITableViewScrollPositionMiddle];
    }
    
    self.searchDisplayController.searchResultsDataSource = self;
    self.searchDisplayController.searchResultsDelegate = self;
}

- (void)viewDidUnload
{
    [self setSearchDisplayController:nil];
    [super viewDidUnload];
    // Release any retained subviews of the main view.
    // e.g. self.myOutlet = nil;
}

- (void)update
{
    self.searchDisplayController.searchBar.hidden = !self.delegate.indexDone;
}

- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    
    [self update];
}

- (void)viewDidAppear:(BOOL)animated
{
    [super viewDidAppear:animated];
}

- (void)viewWillDisappear:(BOOL)animated
{
	[super viewWillDisappear:animated];
}

- (void)viewDidDisappear:(BOOL)animated
{
	[super viewDidDisappear:animated];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    return YES;
}

#pragma mark UITableView

// Customize the number of sections in the table view.
- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    if (tableView == self.tableView)
    {
        return data.count;
    }
    else if (tableView == self.searchDisplayController.searchResultsTableView)
    {
        return searchResults.count;
    }
}

// Customize the appearance of table view cells.
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    if (tableView == self.tableView)
    {
        
        static NSString *CellIdentifier = @"Cell";
        
        UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
        if (cell == nil)
        {
            cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:CellIdentifier];
        }
        
        if (indexPath.row < data.count)
        {
            NSDictionary* cellData = (NSDictionary*) [data objectAtIndex:indexPath.row];
        
            
            /*
             if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPhone)
             {
             cell.accessoryType = UITableViewCellAccessoryDisclosureIndicator;
             }*/
            NSString* viewId = [cellData objectForKey:@"viewId"];
            
            cell.accessoryType = viewId ? UITableViewCellAccessoryDisclosureIndicator : UITableViewCellAccessoryNone;
            
            // Configure the cell.
            cell.textLabel.text = [cellData objectForKey:@"text"];
            cell.textLabel.adjustsFontSizeToFitWidth = YES;
            int lev = 0;
            NSString* level = [cellData objectForKey:@"level"];
            if (level)
            {
                lev = [level intValue] -1;
                
            }
            cell.textLabel.font = [UIFont systemFontOfSize:18-lev*2];
            cell.indentationLevel = lev;
            
            cell.indentationWidth = 25;
        }
        
        return cell;
    }
    else if (tableView == self.searchDisplayController.searchResultsTableView)
    {
        static NSString *CellIdentifier = @"SearchCell";
        const CGFloat fontSize = 18;
 
        
        
        UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
        if (cell == nil)
        {
            cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:CellIdentifier];
        }
        
        UIFont *boldFont = [UIFont boldSystemFontOfSize:cell.textLabel.font.pointSize];
        NSDictionary *boldattrs = [NSDictionary dictionaryWithObjectsAndKeys:
                                   boldFont, NSFontAttributeName, nil];
        
        if (self.searchResults && indexPath.row < self.searchResults.count)
        {
            IndexEntry* entry = self.searchResults[indexPath.row];
            
            NSMutableAttributedString *attributedText =
            [[NSMutableAttributedString alloc] initWithString:entry.text attributes:nil];
            
            NSRange match = [entry.text rangeOfString:self.searchTerm options:NSCaseInsensitiveSearch];
                             
            if (match.location != NSNotFound)
            {
                [attributedText setAttributes:boldattrs range:match];
            }
            
            if ([cell.textLabel respondsToSelector:@selector(setAttributedText:)])
            {
                cell.textLabel.attributedText = attributedText;
            }
            else
                cell.textLabel.text = entry.text;
                             
            if (entry.elementId)
            {
                
                cell.detailTextLabel.text = entry.viewName;
            }
            else
            {
                cell.detailTextLabel.text = @"";
            }

        }
        return cell;
    }
}



- (AppDelegate*) delegate
{
    return (AppDelegate*)[[UIApplication sharedApplication]delegate];
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{

    NSString* viewId;
    NSString* elementId;
    NSString* title;
    
    if (tableView == self.tableView)
    {
        NSDictionary* cellData = (NSDictionary*) [data objectAtIndex:indexPath.row];
        viewId = [cellData objectForKey:@"viewId"];

        title = [cellData objectForKey:@"text"];
    }
    else if (tableView == self.searchDisplayController.searchResultsTableView)
    {
        if (self.searchResults && indexPath.row < self.searchResults.count)
        {
            IndexEntry* entry = self.searchResults[indexPath.row];
            viewId = entry.viewId;
            title = entry.viewName;
            elementId = entry.elementId;
        }
    }

    if (viewId)
    {
        [self.searchDisplayController.searchBar resignFirstResponder ];
        
        [self.delegate showView: viewId
                      withTitle: title
                     clearStack:YES
                  withElementId:elementId];
        
        
        
    }
}

@end
