//
//  DetailViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 30/12/2014.
//  Copyright (c) 2014 thesarvo. All rights reserved.
//

import UIKit

class DetailViewController: UIViewController, UIWebViewDelegate
{

    @IBOutlet weak var detailDescriptionLabel: UILabel!

    @IBOutlet weak var webview: UIWebView!

    var singleNodeData: String?
    var guide: Guide?
    var elemendId: String?
    
    var viewId: String = ""
    {
        didSet
        {
            if (viewId.hasPrefix("guide."))
            {
                viewId = viewId.removePrefixIfPresent("guide.")
            }
            
            if (!isHttp() && viewId.length > 0)
            {
                guide = Guide(guideId: viewId)
            }
            else
            {
                guide = nil
            }
            
        }
    }
    
    func isHttp() -> Bool
    {
        return viewId.hasPrefix("http")
    }

    

    func configureView()
    {
        webview?.delegate = self
        
        if isHttp()
        {
            if let url = NSURL( string: viewId)
            {
                webview.loadRequest(NSURLRequest( URL: url ) )
            }
        }
        else if let guide = guide
        {
            if let url = NSBundle.mainBundle().URLForResource("index", withExtension: "html", subdirectory: "www")
            {
                webview.loadRequest(NSURLRequest( URL: url ) )
            }

        }
    }


    override func viewDidLoad()
    {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        //self.configureView()
    }
    
    override func viewWillAppear(animated: Bool)
    {
        configureView()
    }
    
    override func viewWillDisappear(animated: Bool)
    {
        webview?.delegate = nil
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

    func JSEscape(data: String) -> String
    {

        var d = data.stringByReplacingOccurrencesOfString("\n", withString: "\\n")
        d = d.stringByReplacingOccurrencesOfString("\r", withString: "\\r")
        d = d.stringByReplacingOccurrencesOfString("'", withString: "\\'")
        return d
    }
    
    func loadGuideData()
    {
        if let guide = guide
        {
            var data: String?
            var callOut = false
            
            if let singleNodeData = singleNodeData
            {
                callOut = true
                data = singleNodeData
                if !singleNodeData.hasPrefix("<guide")
                {
                    data = "<guide>\(singleNodeData)</guide>"
                }
            }
            else
            {
                data = guide.loadDataAsString()
            }
            
            if let data = data
            {
                var d = JSEscape(data)
                
                var js = "var guide_pageid='\(guide.guideId)'; \n  var guide_xml='\(d)'; var guide_callOut=\(callOut) ;"
                
                if (elemendId != nil)
                {
                    js += " var guide_showId='\(elemendId)';"
                    
                }
                
                var result = webview.stringByEvaluatingJavaScriptFromString(js)
            }
        }
    }

    // MARK: - UIWebViewDelegate
    func webViewDidFinishLoad(webView: UIWebView)
    {
        self.loadGuideData()

    }
    
    func webView(webView: UIWebView, shouldStartLoadWithRequest request: NSURLRequest, navigationType: UIWebViewNavigationType) -> Bool
    {
        var url = request.URL
        if url.scheme == "ts"
        {
            var command = url.host
            var commandData = url.path?.removePrefixIfPresent("/")
            
            if (command == "openImage")
            {
                let callback = SegueCallback
                {
                    (vc: UIViewController) in
                    if let fcvc = DetailViewController.getFromVC(vc)
                    {
                        fcvc.viewId = self.viewId
                        fcvc.guide = self.guide
                        fcvc.singleNodeData = commandData
                        fcvc.navigationItem.title = self.navigationItem.title
                    }
                }
                self.performSegueWithIdentifier("showDetail", sender: callback)
            }
            else if (command == "map")
            {
                // TODO
            }
            
        }
        
        return true
    }
    
    func webView(webView: UIWebView, didFailLoadWithError error: NSError)
    {
        var alert = UIAlertView(title: "Error", message: "Could not load page", delegate: nil, cancelButtonTitle: "OK")
        alert.show()
    }
    
    class func getFromVC(uivc: UIViewController) -> DetailViewController?
    {
        if let ret = uivc as? DetailViewController
        {
            return ret
        }
        
        if let uinc = uivc as? UINavigationController
        {
            if let ret = uinc.topViewController as? DetailViewController
            {
                return ret
            }
        }
        
        return nil
    }
    
}

