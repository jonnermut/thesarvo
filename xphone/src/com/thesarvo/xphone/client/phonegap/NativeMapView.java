package com.thesarvo.xphone.client.phonegap;

import java.util.List;

import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.xphone.client.event.ViewTransition;
import com.thesarvo.xphone.client.event.ViewTransitionEvent;
import com.thesarvo.xphone.client.geo.GeoUtil;
import com.thesarvo.xphone.client.model.ViewConfig;
import com.thesarvo.xphone.client.util.StringUtil;
import com.thesarvo.xphone.client.view.BaseView;

public class NativeMapView extends BaseView
{
	static List<Node> points = null;
	
	NativeMap nativeMap = null;
	
	
	public NativeMapView(ViewConfig vc)
	{
		super(vc);
	}
	
	@Override
	protected void init()
	{
		nativeMap = new NativeMap();
	}

	@Override
	public void onViewTransition(ViewTransitionEvent event)
	{
		ViewTransition vt = event.getViewTransition();
		
		if (! vt.isReverse())
		{
			showMap();
		}
		else
		{
			hideMap();
		}
	}

	private void hideMap()
	{
		PhoneGap.log("hideMap");
		
		if (nativeMap!=null && NativeMap.isAvailable())
			nativeMap.reset();
	}

	private void showMap()
	{
		PhoneGap.log("showMap");
		
		
		if (NativeMap.isAvailable())
		{
			//nativeMap = new NativeMap();
			
			nativeMap.reset();
			nativeMap.init();
			
			nativeMap.setShowsUserLocation(true);
		
			double centlat=0;
			double centlong=0;
			double span = 0.003; // TODO
			
			
			for (Node n : points)
			{
				Element point = (Element) n;
				
				final String easting = StringUtil.notNull(point.getAttribute("easting"));
				final String northing = StringUtil.notNull(point.getAttribute("northing"));
				final String code = StringUtil.notNull(point.getAttribute("code"));
				final String description = StringUtil.notNull(point.getAttribute("description"));
				
				double[] ll = GeoUtil.getLatLong(easting, northing);
				if (ll!=null)
				{
					nativeMap.addPoint(ll[0], ll[1], code, description, "ff0000", null);
					
					// TODO
					centlat = ll[0];
					centlong = ll[1];
				}
				
			}
			
			//nativeMap.center(centlat, centlong, span, span);
			nativeMap.centerAndZoomToAnnotations();
		}			
	

	}

	/**
	 * @return the points
	 */
	public static List<Node> getPoints()
	{
		return points;
	}

	/**
	 * @param points the points to set
	 */
	public static void setPoints(List<Node> points)
	{
		NativeMapView.points = points;
	}
	
}
