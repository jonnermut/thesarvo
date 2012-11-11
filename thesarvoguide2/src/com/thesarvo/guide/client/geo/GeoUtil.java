package com.thesarvo.guide.client.geo;


public abstract class GeoUtil
{
	public static double[] getLatLong(String easting, String northing)
	{
		try
		{
			
			double x = Double.valueOf(easting);
			double y = Double.valueOf(northing);
			double[] ll = getLatLong(x, y);
			return ll;
		}
		catch (Exception e)
		{
			return null;
		}
	}

	public static double[] getLatLong(double x, double y)
	{
		CoordinateConversion cc = new CoordinateConversion();
		double[] ll = cc.utm2LatLon(55, "G", x, y);
		return ll;
	}

}
