package com.thesarvo.confluence;


public class Convert
{

	/**
	 * @param args
	 */
	public static void main(String[] args)
	{
		double x = 531523;
		double y = 5253606;
		

		CoordinateConversion cc = new CoordinateConversion();
		
		//String UTM = "55 G " + x + " " + y;
		double[] out = cc.utm2LatLon(55, "G", x, y);
		
		System.out.println(out[0]);
		System.out.println(out[1]);
		

	}

}
