package com.thesarvo.guide.client.model;

import com.google.gwt.maps.client.MapWidget;
import com.google.gwt.maps.client.base.LatLng;
import com.google.gwt.maps.client.mvc.MVCArray;
import com.google.gwt.maps.client.overlays.Circle;
import com.google.gwt.maps.client.overlays.Marker;
import com.google.gwt.maps.client.overlays.Polygon;
import com.google.gwt.maps.client.overlays.Polyline;
import com.google.gwt.maps.client.overlays.Rectangle;
import com.google.gwt.xml.client.Element;
import com.thesarvo.guide.client.geo.CoordinateConversion;
import com.thesarvo.guide.client.geo.CoordinateConversion.UTM;
import com.thesarvo.guide.client.geo.GeoUtil;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.view.node.GPSConstants;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class MapDrawingObject implements GPSConstants
{
	Element xml;

	XmlSimpleModel model = null;
	public XmlSimpleModel getModel()
	{
		return model;
	}

	Object overlay = null;
	
	static int pointId = 0;
	
	
	public MapDrawingObject(Element xml)
	{
		super();
		this.xml = xml;
		model = new XmlSimpleModel(xml);
		
		getPid();
	}


	/**
	 * @return the xml
	 */
	public Element getXml()
	{
		return xml;
	}


	/**
	 * @param xml the xml to set
	 */
	public void setXml(Element xml)
	{
		this.xml = xml;
		model = new XmlSimpleModel(xml);
	}


	/**
	 * @return the code
	 */
	public String getCode()
	{
		return model.get(CODE);
	}


	/**
	 * @param code the code to set
	 */
	public void setCode(String code)
	{
		model.put(CODE, code);
	}


	/**
	 * @return the description
	 */
	public String getDescription()
	{
		return model.get(DESCRIPTION);
	}


	/**
	 * @param description the description to set
	 */
	public void setDescription(String description)
	{
		model.put(DESCRIPTION, description);
	}


	/**
	 * @return the zone
	 */
	public String getZone()
	{
		return model.get(ZONE);
	}


	/**
	 * @param zone the zone to set
	 */
	public void setZone(String zone)
	{
		model.put(ZONE, zone);
	}


	/**
	 * @return the type
	 */
	public String getType()
	{
		return xml.getNodeName();
	}


	/**
	 * @return the northing
	 */
	public String getNorthing()
	{
		return model.get(NORTHING);
	}


	/**
	 * @param northing the northing to set
	 */
	public void setNorthing(String northing)
	{
		model.put(NORTHING, northing);
	}


	/**
	 * @return the easting
	 */
	public String getEasting()
	{
		return model.get(EASTING);
	}


	/**
	 * @param easting the easting to set
	 */
	public void setEasting(String easting)
	{
		model.put(EASTING, easting);
	}


	/**
	 * @return the height
	 */
	public String getHeight()
	{
		return model.get(HEIGHT);
	}


	/**
	 * @param height the height to set
	 */
	public void setHeight(String height)
	{
		model.put(HEIGHT, height);
	}


	/**
	 * @return the latitude
	 */
	public String getLatitude()
	{
		return model.get(LATITUDE);
	}


	/**
	 * @param latitude the latitude to set
	 */
	public void setLatitude(String latitude)
	{
		model.put(LATITUDE, latitude);
	}


	/**
	 * @return the longitude
	 */
	public String getLongitude()
	{
		return model.get(LONGITUDE);
	}


	/**
	 * @param longitude the longitude to set
	 */
	public void setLongitude(String longitude)
	{
		model.put(LONGITUDE, longitude);
	}


	/**
	 * @return the text
	 */
	public String getText()
	{
		return model.get(".");
	}


	/**
	 * @param text the text to set
	 */
	public void setText(String text)
	{
		model.put(".", text);
	}


	/**
	 * @return the radius
	 */
	public String getRadius()
	{
		return model.get(RADIUS);
	}


	/**
	 * @param radius the radius to set
	 */
	public void setRadius(String radius)
	{
		model.put(RADIUS, radius);
	}
	
	/**
	 * @return the radius
	 */
	public String getPid()
	{
		String ret = model.get(PID);
		
		if (StringUtil.isEmpty(ret))
		{
			ret = "" + (++pointId);
			setPid( ret );
			
		}
		else
		{
			// make sure the max pid is set
			
			pointId = Math.max(pointId, model.getInt(PID) );
		}
		return ret;
	}


	/**
	 * @param radius the radius to set
	 */
	public void setPid(String pid)
	{
		model.put(PID, pid);
	}


	/**
	 * @return the googleMapObject
	 */
	public Object getOverlay()
	{
		return overlay;
	}


	/**
	 * @param googleMapObject the googleMapObject to set
	 */
	public void setOverlay(Object googleMapObject)
	{
		this.overlay = googleMapObject;
	}


	public void removeFromMap()
	{
		if (overlay != null)
		{
			if (overlay instanceof Marker)
				((Marker)overlay).setMap((MapWidget)null);
			else if (overlay instanceof Rectangle)
				((Rectangle)overlay).setMap((MapWidget)null);
			else if (overlay instanceof Polyline)
				((Polyline)overlay).setMap((MapWidget)null);
			else if (overlay instanceof Polygon)
				((Polygon)overlay).setMap((MapWidget)null);
			else if (overlay instanceof Circle)
				((Circle)overlay).setMap((MapWidget)null);
			
		}
		
	}


	public MVCArray<LatLng> getPath()
	{
		String spath = getText();
		MVCArray<LatLng> path = MVCArray.newInstance();
		String[] split = spath.split(" ");
		for(String p : split)
		{
			p = p.trim();
			LatLng platlng = getLatLng(p);
			if (platlng != null)
			{
				path.push(platlng);
			}
		}
		return path;
	}
	
	public void setPath(MVCArray<LatLng> points)
	{
		String text = "";
		for (int g = 0; g < points.getLength(); g++)
		{
			LatLng p = points.get(g);
			text += latlngToString(p) + " \n";
		}
		setText(text);
	}
	
	public static String latlngToString(LatLng latlng)
	{
		return latlng.getToUrlValue(6);
	}

	public LatLng getLatLng()
	{
		final String easting = StringUtil
				.notNull(getEasting());
		final String northing = StringUtil.notNull(getNorthing());
		final String zone = StringUtil.notNull(getZone());
		final String latitude = StringUtil.notNull(getLatitude());
		final String longitude = StringUtil.notNull(getLongitude());

		LatLng latlng = null;
		if (StringUtil.isEmpty(latitude) || StringUtil.isEmpty(longitude))
		{
			// use utm
			double[] ll = GeoUtil.getLatLong(easting, northing, zone);
			latlng = LatLng.newInstance(ll[0], ll[1]);
		}
		else
		{
			// use lat,lng
			try
			{
				double lat = Double.parseDouble(latitude);
				double lon = Double.parseDouble(longitude);
				latlng = LatLng.newInstance(lat, lon);
			}
			catch (Exception e)
			{

			}
		}
		return latlng;
	}

	public String getTextForPoint()
	{
		final String code = StringUtil.notNull(getCode());
		final String description = StringUtil.notNull(getDescription());
		String t = "";
		if (StringUtil.isNotEmpty(code))
			t += code;
		if (StringUtil.isNotEmpty(description))
		{
			if (StringUtil.isNotEmpty(t))
				t += " - ";

			t += description;
		}

		final String text = t;
		return text;
	}
	
	
	
	public static LatLng getLatLng(String slatlng)
	{
		String[] split = slatlng.split(",");
		if (split.length > 1)
		{
			return getLatLng(split[0], split[1]);
		}
		return null;
	}

	public static LatLng getLatLng(String slat, String slong)
	{
		try
		{
			Double lat = Double.parseDouble(slat);
			Double lon = Double.parseDouble(slong);
			return LatLng.newInstance(lat, lon);
		}
		catch (Exception e)
		{}
		return null;
	}


	public void setLatLng(LatLng pos)
	{
		
		setLatitude( "" + GeoUtil.formatLatLong(pos.getLatitude()));
		setLongitude("" + GeoUtil.formatLatLong(pos.getLongitude()));
		setUTMFromLatLng();
		
	}
	
	public void setUTMFromLatLng()
	{
		String lat = getLatitude();
		String lon = getLongitude();
		
		if (StringUtil.isNotEmpty(lat) && StringUtil.isNotEmpty(lon))
		{
			UTM utm = GeoUtil.getUTMFromLatLon(lat, lon);
			if (utm != null)
			{
				setEasting( "" + (int) utm.getEasting());
				setNorthing( "" + (int) utm.getNorthing());
				setZone( "" + utm.getLongZone() + utm.getLatZone());
				
			}
		}
	}
	
	public void setLatLngFromUTM()
	{
		try
		{
			CoordinateConversion cc = new CoordinateConversion();

			double[] latlon = GeoUtil.getLatLong(getEasting(), getNorthing(), getZone());
			if (latlon != null)
			{
				setLatitude(GeoUtil.formatLatLong(latlon[0]));
				setLongitude(GeoUtil.formatLatLong(latlon[1]));
			}
		}
		catch (Exception e)
		{

		}
		
	}
	
}
