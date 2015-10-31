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
    
    override func viewDidLoad()
    {
        super.viewDidLoad()

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
            
        }
    }

    override func didReceiveMemoryWarning()
    {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?) {
        // Get the new view controller using segue.destinationViewController.
        // Pass the selected object to the new view controller.
    }
    */

}
