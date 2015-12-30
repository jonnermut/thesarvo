//
//  MapViewController.swift
//  thesarvo
//
//  Created by Jon Nermut on 3/01/2015.
//  Copyright (c) 2015 thesarvo. All rights reserved.
//

import UIKit
import MapKit

class MapViewController: UIViewController
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
        let zoomRect2 = self.mapView.mapRectThatFits(zoomRect)
        self.mapView.setVisibleMapRect(zoomRect2, edgePadding: UIEdgeInsets(top: 20,left: 20,bottom: 20,right: 20), animated: false)
        print("Setting zoom rect to \(zoomRect2)")
    }
    
    override func viewWillAppear(animated: Bool)
    {

    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    


}
