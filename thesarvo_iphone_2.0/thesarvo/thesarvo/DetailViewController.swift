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
    
    var guideLoadad = false

    public static var last: DetailViewController? = nil
    
    
    func isHttp() -> Bool
    {
        return viewId.hasPrefix("http")
    }

    

    func configureView()
    {
        webview?.delegate = self
        
        webview?.scrollView.decelerationRate = UIScrollViewDecelerationRateNormal
        
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
        
        //AppDelegate.instance().setupSplitViewButtons(self)
        
    }


    override func viewDidLoad()
    {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        self.configureView()
    }
    
    
    
    override func viewWillAppear(animated: Bool)
    {
        setupNavButtons()
        webview?.delegate = self
        DetailViewController.last = self
    }
    
    func setupNavButtons()
    {
        self.navigationItem.leftItemsSupplementBackButton = true
        self.navigationItem.leftBarButtonItem =
            UIBarButtonItem(image: UIImage(named: "hamburger"), style: UIBarButtonItemStyle.Plain, target: self, action: Selector("hamburgerToggle") )
    }
    
    dynamic func hamburgerToggle()
    {
        AppDelegate.instance().drawerController.toggle()
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
    
    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?)
    {
        let dest: UIViewController = segue.destinationViewController as UIViewController
        
        if (sender is SegueCallback)
        {
            (sender as! SegueCallback).function(dest)
        }
        
//        if (segue.identifier == "showPageSearch")
//        {
//            if let vc = dest as? PageSearchTableViewController
//            {
//                vc.guide = guide
//                vc.detailViewController = self
//            }
//        }
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
        if guideLoadad
        {
            return
        }
        guideLoadad = true
        
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
                let d = JSEscape(data)
                
                var js = "var guide_pageid='\(guide.guideId)'; \n  var guide_xml='\(d)'; var guide_callOut=\(callOut) ;"
                
                if (elemendId != nil)
                {
                    js += " var guide_showId='\(elemendId!)';"
                    
                }
                
                let imageUrls = guide.getImageUrls() as NSDictionary
                if let jsonData = try? NSJSONSerialization.dataWithJSONObject(imageUrls, options: NSJSONWritingOptions.PrettyPrinted)
                {
                    if let jsonString = String(data: jsonData, encoding: NSUTF8StringEncoding)
                    {
                        let imageJs = "\n var guide_imageUrls=\(jsonString);"
                        js += imageJs
                    }
                }
                
                var result = webview.stringByEvaluatingJavaScriptFromString(js)
            }
        }
    }

    // MARK: - UIWebViewDelegate
    func webViewDidFinishLoad(webView: UIWebView)
    {
        self.loadGuideData()

//        if let el = self.elemendId
//        {
//            self.scrollToId(el)
//        }
    }
    
    func webView(webView: UIWebView, shouldStartLoadWithRequest request: NSURLRequest, navigationType: UIWebViewNavigationType) -> Bool
    {
        if let url = request.URL
        {
            if url.scheme == "ts"
            {
                let command = url.host
                let commandData = url.path?.removePrefixIfPresent("/")
                
                if (command == "openImage")
                {
                    /*
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
                    self.performSegueWithIdentifier("showDetailFromDetail", sender: callback)
*/
                    
                    var fcvc = self.storyboard?.instantiateViewControllerWithIdentifier("detailViewController") as! DetailViewController
                    //var fcvc = DetailViewController()
                    fcvc.viewId = self.viewId
                    fcvc.guide = self.guide
                    fcvc.singleNodeData = commandData
                    fcvc.navigationItem.title = "Topo"
                    self.navigationController?.pushViewController(fcvc, animated: true)
                }
                else if (command == "map")
                {
                    let callback = SegueCallback
                    {
                        (vc: UIViewController) in
                        if let mvc = vc as? MapViewController
                        {
                            mvc.guide = self.guide
                            //fcvc.navigationItem.title = self.navigationItem.title
                        }
                    }
                    self.performSegueWithIdentifier("showMap", sender: callback)
                }
                
                return false
                
            }
        }
        return true
    }
    
    func webView(webView: UIWebView, didFailLoadWithError error: NSError?)
    {
        let alert = UIAlertView(title: "Error", message: "Could not load page", delegate: nil, cancelButtonTitle: "OK")
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
    
    func scrollToId(id: String)
    {
        webview.stringByEvaluatingJavaScriptFromString("scrollToId('\(id)')")

    }
    
}

