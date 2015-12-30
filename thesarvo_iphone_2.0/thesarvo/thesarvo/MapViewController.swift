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
        
        var zoomRect = MKMapRectNull;
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
        zoomRect = self.mapView.mapRectThatFits(zoomRect)
        self.mapView.setVisibleMapRect(zoomRect, animated: false)
        print("Setting zoom rect to \(zoomRect)")
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    


}
