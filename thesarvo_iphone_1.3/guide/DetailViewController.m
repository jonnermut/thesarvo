//
//  DetailViewController.m
//  guide
//
//  Created by Jon Nermut on 1/10/11.
//  Copyright (c) 2011 Asdeq Labs. All rights reserved.
//

#import "DetailViewController.h"
#import "AppDelegate.h"
#import "MapViewController.h"


@implementation DetailViewController



- (AppDelegate*) delegate
{
    return (AppDelegate*)[[UIApplication sharedApplication]delegate];
}

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) 
    {
        
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

- (BOOL) isHttp
{
    return [self.guideId hasPrefix:@"http"];
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    
    NSURL* url = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:@"www"];
    
    //NSData* data = [NSData dataWithContentsOfURL:url];
    
    NSString* str = [NSString stringWithContentsOfURL:url];
    
    if (self.isHttp)
    {
        NSURL* url = [NSURL URLWithString:self.guideId];
        NSURLRequest* request = [NSURLRequest requestWithURL:url];
        [self.webview loadRequest:request];

    }
    else
    {
        [self.webview loadHTMLString:str baseURL:url];
        //[self.webview loadData:data MIMEType:@"text/html" textEncodingName:@"UTF-8" baseURL:url];
    }
    
    if ([[UIDevice currentDevice].systemVersion floatValue] >= 5.0f)
        self.webview.scrollView.decelerationRate = UIScrollViewDecelerationRateNormal;
                   
}

- (void)viewDidUnload
{
    [self setWebview:nil];
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
    else if ([scheme isEqualToString:@"ts"])
    {
        NSString* command = request.URL.host;
        NSString* data = request.URL.path;
        if ([data hasPrefix:@"/"])
            data = [data substringFromIndex:1];
        
        if ([command isEqualToString:@"openImage"])
        {
            DetailViewController* dvc = [[DetailViewController alloc] init];
            dvc.title = [NSString stringWithFormat:@"%@ Topo", self.title];
            dvc.singleNodeData = data;
            dvc.guideId = self.guideId;
            [self.navigationController pushViewController:dvc animated:YES];
        }
        
        if ([command isEqualToString:@"map"])
        {
            MapViewController* mvc = [[MapViewController alloc] init];
            mvc.singleNodeData = data;
            mvc.title = [NSString stringWithFormat:@"%@ Map", self.title];
            //dvc.guideId = self.guideId;
            [self.navigationController pushViewController:mvc animated:YES];
        }
        
        return NO;
    }
    
    return YES;
}

- (void)webViewDidStartLoad:(UIWebView *)webView
{
    
}



- (void)webViewDidFinishLoad:(UIWebView *)webView
{
    [self.activity stopAnimating];
    self.activity.hidden = YES;
    
    NSLog(@"webViewDidFinishLoad: %@", webView);
    if (self.guideId && !self.isHttp)
    {
        NSString* data = @"";
        BOOL callOut = NO;
        
        if (self.singleNodeData)
        {
            callOut = YES;
            data = self.singleNodeData;
            if ( [data rangeOfString:@"<guide"].length == 0 )
            {
                data = [NSString stringWithFormat:@"<guide>%@</guide>", data];
            }
        }
        else
        {
            data = [self.delegate getGuideData: self.guideId];
        }
        
        //NSLog(@"data = %@", data);
        
        data = [data stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        data = [data stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];
        data = [data stringByReplacingOccurrencesOfString:@"'" withString:@"\\'"];
        
        NSString* js = [NSString stringWithFormat:@"var guide_pageid='%@'; \n  var guide_xml='%@'; guide=%@ ;", self.guideId, data, callOut ? @"true" : @"false"];
        
        if (self.elementId)
        {
            js = [NSString stringWithFormat:@"%@ var guide_showId='%@';", js, self.elementId];
            
        }
        
        //NSLog(@"js = %@", data);

        NSString* result = [webView stringByEvaluatingJavaScriptFromString:js];
        
        //NSLog(@"result = %@", result);
    }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error
{
    [self.activity stopAnimating];
    self.activity.hidden = YES;
    
    UIAlertView* alert = [[UIAlertView alloc] initWithTitle:@"Error" message:@"Could not load page" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles: nil];
    [alert show];
    
}


							

@end
