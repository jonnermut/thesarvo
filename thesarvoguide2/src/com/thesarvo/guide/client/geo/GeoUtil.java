package com.thesarvo.guide.client.geo;

import com.google.gwt.i18n.client.NumberFormat;
import com.thesarvo.guide.client.geo.CoordinateConversion.UTM;
import com.thesarvo.guide.client.util.StringUtil;


public abstract class GeoUtil
{
	public static final NumberFormat LATFORMAT = NumberFormat.getFormat("0.00000");
	
	public static final String formatLatLong(double latOrLon)
	{
		return LATFORMAT.format(latOrLon);
	}
	
	public static final String formatLatLong(double[] latOrLon)
	{
		return LATFORMAT.format(latOrLon[0]) + "," + LATFORMAT.format(latOrLon[1]);
	}
	
	
	public static double[] getLatLong(String easting, String northing, String zone)
	{
		try
		{
			
			double x = Double.valueOf(easting);
			double y = Double.valueOf(northing);
			double[] ll = getLatLong(x, y, zone);
			return ll;
		}
		catch (Exception e)
		{
			return null;
		}
	}

	public static double[] getLatLong(double x, double y, String zone)
	{
		if (StringUtil.isEmpty(zone))
			zone = "55G";
		
		String z1 = "";
		String z2 = "";
		
		for (int i=0; i<zone.length(); i++)
		{
			char c = zone.charAt(i);
			if (Character.isDigit(c))
				z1 += c;
			else
				z2 += c;
		}
		
		int z1int = Integer.parseInt(z1);
		
		CoordinateConversion cc = new CoordinateConversion();
		double[] ll = cc.utm2LatLon(z1int, z2, x, y);
		return ll;
	}
	
	public static UTM getUTMFromLatLon(double[] latlon)
	{
		CoordinateConversion cc = new CoordinateConversion();
		UTM ret = cc.latLon2UTM(latlon[0], latlon[1]);
		return ret;
	}
	
	public static UTM getUTMFromLatLon(String lat, String lon)
	{
		try
		{
			
			double dlat = Double.valueOf(lat);
			double dlon = Double.valueOf(lon);
			return getUTMFromLatLon(new double[]{ dlat, dlon} );
		}
		catch (Exception e)
		{
			return null;
		}
	}
			

}
