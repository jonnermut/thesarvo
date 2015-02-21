package com.thesarvo.guide.client.geo;

public class KMLPathToPolyline
{

	public static void main(String[] args)
	{
		// just swaps co-ords around at the moment from args 0
		
		String[] split = args[0].split("\n");
		for (String each : split)
		{
			String[] delim = each.split(",");
			System.out.print( delim[1] + "," + delim[0] + " ");
		}

	}

}
