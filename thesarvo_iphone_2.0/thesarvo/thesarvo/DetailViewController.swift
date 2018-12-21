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
    
    static var firstEverLoad = true

    static var last: DetailViewController? = nil
    
    
    func isHttp() -> Bool
    {
        return viewId.hasPrefix("http")
    }

    

    func configureView()
    {
        webview?.delegate = self
        
        webview?.scrollView.decelerationRate = UIScrollView.DecelerationRate.normal
        
        if isHttp()
        {
            if let url = Foundation.URL( string: viewId)
            {
                webview.loadRequest(URLRequest( url: url ) )
            }
        }
        else
        {
            if guide == nil && DetailViewController.firstEverLoad
            {
                DetailViewController.firstEverLoad = false
                
                viewId = UserDefaults.standard.string(forKey: "lastViewId") ?? "guide.9404494"
                
                guide = Model.instance.getGuide(viewId, name: "")
            }
            
            if let guide = guide
            {
                if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www")
                {
                    webview.loadRequest(URLRequest( url: url ) )
                }
                
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
    
    
    
    override func viewWillAppear(_ animated: Bool)
    {
        setupNavButtons()
        webview?.delegate = self
        DetailViewController.last = self

        if viewId.characters.count > 0
        {
            UserDefaults.standard.set(viewId, forKey: "lastViewId")
        }
        
    }
    
    func setupNavButtons()
    {
        self.navigationItem.leftItemsSupplementBackButton = true
        self.navigationItem.leftBarButtonItem =
            UIBarButtonItem(image: UIImage(named: "hamburger"), style: UIBarButtonItem.Style.plain, target: self, action: #selector(DetailViewController.hamburgerToggle) )
    }
    
    @objc dynamic func hamburgerToggle()
    {
        AppDelegate.instance().drawerController.toggle()
    }
    
    override func viewWillDisappear(_ animated: Bool)
    {
        webview?.delegate = nil
    }


    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    override func prepare(for segue: UIStoryboardSegue, sender: Any?)
    {
        let dest: UIViewController = segue.destination as UIViewController
        
        if (sender is SegueCallback)
        {
            (sender as! SegueCallback).function(dest)
        }
        
    }

    func JSEscape(_ data: String) -> String
    {

        var d = data.replacingOccurrences(of: "\n", with: "\\n")
        d = d.replacingOccurrences(of: "\r", with: "\\r")
        d = d.replacingOccurrences(of: "'", with: "\\'")
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
                if let jsonData = try? JSONSerialization.data(withJSONObject: imageUrls, options: JSONSerialization.WritingOptions.prettyPrinted)
                {
                    if let jsonString = String(data: jsonData, encoding: String.Encoding.utf8)
                    {
                        let imageJs = "\n var guide_imageUrls=\(jsonString);"
                        js += imageJs
                    }
                }
                
                var result = webview.stringByEvaluatingJavaScript(from: js)
                
                
                // setup font size
                let fontSizeIndex = UserDefaults.standard.integer(forKey: "fontSizeIndex")
                if fontSizeIndex > 0
                {
                    let fontsize = 100 + fontSizeIndex * 50
                    let fontSizeJs = "document.getElementsByTagName('body')[0].style.webkitTextSizeAdjust='\(fontsize)%';"
                    webview.stringByEvaluatingJavaScript(from: fontSizeJs)
                }
            }
        }
    }

    // MARK: - UIWebViewDelegate
    func webViewDidFinishLoad(_ webView: UIWebView)
    {
        self.loadGuideData()

//        if let el = self.elemendId
//        {
//            self.scrollToId(el)
//        }
    }
    
    func webView(_ webView: UIWebView, shouldStartLoadWith request: URLRequest, navigationType: UIWebView.NavigationType) -> Bool
    {
        if let url = request.url
        {
            if url.scheme == "ts"
            {
                let command = url.host
                let commandData = url.path.removePrefixIfPresent("/")
                
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
                    
                    let fcvc = self.storyboard?.instantiateViewController(withIdentifier: "detailViewController") as! DetailViewController
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
                    self.performSegue(withIdentifier: "showMap", sender: callback)
                }
                
                return false
                
            }
        }
        return true
    }
    
    func webView(_ webView: UIWebView, didFailLoadWithError error: Error)
    {
        let alert = UIAlertView(title: "Error", message: "Could not load page", delegate: nil, cancelButtonTitle: "OK")
        alert.show()
    }
    
    class func getFromVC(_ uivc: UIViewController) -> DetailViewController?
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
    
    func scrollToId(_ id: String)
    {
        webview.stringByEvaluatingJavaScript(from: "scrollToId('\(id)')")

    }
    
}

