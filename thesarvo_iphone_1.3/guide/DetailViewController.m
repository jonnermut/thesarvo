//
//  DetailViewController.m
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import "DetailViewController.h"



@implementation DetailViewController


@synthesize detailDescriptionLabel = _detailDescriptionLabel;
@synthesize masterPopoverController = _masterPopoverController;
@synthesize webview = _webview;
@synthesize mapview = _mapview;
@synthesize showMap;
@synthesize guideId;

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) 
    {
        self.showMap = NO;
        //self.title = NSLocalizedString(@"Detail", @"Detail");
    }
    return self;
}





- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Release any cached data, images, etc that aren't in use.
}

#pragma mark - View lifecycle

- (void)viewDidLoad
{
    [super viewDidLoad];

    
    if (showMap)
    {
        [self.webview setHidden:YES];
        [self.mapview setHidden:NO];
        self.mapview.centerCoordinate = CLLocationCoordinate2DMake(-31.25, 137.5);

    }
    else
    {
        NSURL* url = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:@"www"];
        
        //NSData* data = [NSData dataWithContentsOfURL:url];
        
        NSString* str = [NSString stringWithContentsOfURL:url];
        
        [self.webview loadHTMLString:str baseURL:url];
        //[self.webview loadData:data MIMEType:@"text/html" textEncodingName:@"UTF-8" baseURL:url];
    }
    if ([[UIDevice currentDevice].systemVersion floatValue] >= 5.0f)
        self.webview.scrollView.decelerationRate = UIScrollViewDecelerationRateNormal;
                   
}

- (void)viewDidUnload
{
    [self setWebview:nil];
    [self setMapview:nil];
    [super viewDidUnload];
    // Release any retained subviews of the main view.
    // e.g. self.myOutlet = nil;
}

- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
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
    // Return YES for supported orientations
    /*
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPhone) {
        return (interfaceOrientation != UIInterfaceOrientationPortraitUpsideDown);
    } else {
        return YES;
    }*/
    
    return YES;
}

#pragma mark web view delegate
- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    NSLog(@"shouldStartLoadWithRequest: %@", request.URL);
    
    NSString* url = [NSString stringWithFormat:@"%@", request.URL];
    
    NSString* scheme = request.URL.scheme;
    if ([scheme isEqualToString:@"gap"])
    {
        return NO;
    }
    
    return YES;
}
- (void)webViewDidStartLoad:(UIWebView *)webView
{
    
}

- (void)webViewDidFinishLoad:(UIWebView *)webView
{
    NSLog(@"webViewDidFinishLoad: %@", webView);
    if (self.guideId)
    {
        NSString* prefix = @"http%3A%2F%2Fwww.thesarvo.com%2Fconfluence%2Fplugins%2Fservlet%2Fguide%2Fxml%2F";
        NSString* filename = [NSString stringWithFormat:@"%@%@", prefix, guideId];
        NSURL* url = [[NSBundle mainBundle] URLForResource:filename withExtension:@"" subdirectory:@"www/data/cache"];
        
        NSError* error;
        NSString* data = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
        
        //NSLog(@"data = %@", data);
        
        data = [data stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        data = [data stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];
        data = [data stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
        
        NSString* js = [NSString stringWithFormat:@"var guide_pageid='%@'; \n  var guide_xml='%@'; ", guideId, data];
        
        //NSLog(@"js = %@", data);

        NSString* result = [webView stringByEvaluatingJavaScriptFromString:js];
        
        //NSLog(@"result = %@", result);
    }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    
}


							

@end
