package com.thesarvo.guide.client.util;

public class RGB
{
	public int r=0;
	public int g=0;
	public int b=0;
	
	public RGB(int r, int g, int b)
	{
		super();
		this.r = r;
		this.g = g;
		this.b = b;
	}
	
	
	public RGB(String hexColour)
	{
		if (hexColour.startsWith("#"))
			hexColour = hexColour.substring(1);
		
		int c = Integer.parseInt(hexColour, 16);
		
		b = c & 0xFF;
		g = (c >> 8) & 0xFF;
		r = (c >> 16) & 0xFF;
	}

	public RGB()
	{
	}

	static String to2DigitHex(int i)
	{
		String ret = Integer.toHexString(i & 0xFF);
		if (ret.length() == 1)
			ret = "0" + ret;
		return ret;
	}
	
	public String toHexString()
	{
		return "#" + to2DigitHex(r) + to2DigitHex(g) + to2DigitHex(b);
	}
	
	static RGB interpolate(RGB base, RGB target, double distance)
	{
		RGB ret = new RGB( (int) ( base.r + (target.r-base.r)*distance ),
				(int) ( base.g + (target.g-base.g)*distance ),
				(int) ( base.b + (target.b-base.b)*distance )
				);
		
		return ret;
	}
}
