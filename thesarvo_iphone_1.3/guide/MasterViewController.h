//
//  MasterViewController.h
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import <UIKit/UIKit.h>

@class DetailViewController;

@interface MasterViewController : UITableViewController <UISearchDisplayDelegate>

@property (strong, nonatomic) DetailViewController *detailViewController;
@property (strong, nonatomic) NSArray* data;
@property (strong, nonatomic) NSArray* searchResults;
@property (strong, nonatomic) NSString* searchTerm;
@property (strong, nonatomic) IBOutlet UISearchDisplayController *searchDisplayController;

@property BOOL searching;
@property BOOL searchAgain;

- (void)update;

@end
