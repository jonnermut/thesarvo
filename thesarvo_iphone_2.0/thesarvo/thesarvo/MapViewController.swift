//
//  MapViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 3/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import UIKit
import MapKit

class MapViewController: UIViewController, MKMapViewDelegate
{

    @IBOutlet weak var mapView: MKMapView!
    
    var guide: Guide?
    var gpsNodes: [GpsNode]?
    
    var annots: [MKAnnotation] = []
    
    let loc = CLLocationManager()
    
    var zoomRect = MKMapRectNull
    
    override func viewDidLoad()
    {
        super.viewDidLoad()
        
        loc.requestWhenInUseAuthorization()

        self.mapView.delegate = self
        
        if let guide = guide
        {
            gpsNodes = guide.guideElement?.childrenWithName("gps") as? [GpsNode]
        }
        else
        {
            if Model.instance.indexingDone
            {
                gpsNodes = Model.instance.allGpsNodes
            }
        }
        
        let barButton = MKUserTrackingBarButtonItem( mapView: self.mapView! )
        self.navigationItem.rightBarButtonItem = barButton
        
        
        if let gpsNodes = gpsNodes
        {
            for gps in gpsNodes
            {
                for gpsObj in gps.gpsObjects
                {
                    if let a = gpsObj.getMKAnnotation()
                    {
                        annots.append(a)
                        
                        print("Adding annotation: \(a.title) - \(a.subtitle)")
                        
                        let annotationPoint = MKMapPointForCoordinate(a.coordinate);
                        let pointRect = MKMapRectMake(annotationPoint.x, annotationPoint.y, 0.1, 0.1);
                        zoomRect = MKMapRectUnion(zoomRect, pointRect);
                    }
                    
                }
            }
        }
        
        self.mapView.addAnnotations(annots)

    }
    
    override func viewDidAppear(animated: Bool)
    {
        setupNavButtons()
        
        let zoomRect2 = self.mapView.mapRectThatFits(zoomRect)
        self.mapView.setVisibleMapRect(zoomRect2, edgePadding: UIEdgeInsets(top: 20,left: 20,bottom: 20,right: 20), animated: false)
        print("Setting zoom rect to \(zoomRect2)")
    }
    
    override func viewWillAppear(animated: Bool)
    {

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

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func mapView(mapView: MKMapView, didSelectAnnotationView view: MKAnnotationView)
    {
        if let mkPinView = view as? MKPinAnnotationView
        {
            let rightButton = UIButton(frame: CGRect(x: 0,y: 0,width: 60,height: 32))
            rightButton.setTitle("Open", forState: UIControlState.Normal)
            rightButton.setTitleColor(UIColor.blueColor(), forState: UIControlState.Normal)

            rightButton.contentVerticalAlignment = UIControlContentVerticalAlignment.Center;
            rightButton.contentHorizontalAlignment = UIControlContentHorizontalAlignment.Center;
            
            if (guide == nil)
            {
                mkPinView.rightCalloutAccessoryView = rightButton
            }
        }
    }
    
    func mapView(mapView: MKMapView, didDeselectAnnotationView view: MKAnnotationView)
    {
        
    }
    
    func mapView(mapView: MKMapView, annotationView view: MKAnnotationView, calloutAccessoryControlTapped control: UIControl)
    {
        if let mp = view.annotation as? MapPoint
        {
            if let ie = mp.mapObj.gpsNode.indexEntry
            {
                MasterViewController.last?.navigateToEntry(ie)
            }
        }
    }


}
