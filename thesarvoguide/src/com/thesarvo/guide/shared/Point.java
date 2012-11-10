package com.thesarvo.guide.shared;

import com.google.gwt.xml.client.Attr;
import com.google.gwt.xml.client.Node;



public class Point implements Comparable<Point>
{
	String code;
	String description;
	String zone = "55G";
	
	
	int northing;
	int easting;
	int height;
	
	String url = null;
	String urlName = null;
	
	public Point(String code, String description, int easting, int northing, int height)
	{
		super();
		this.code = code;
		this.description = description;
		this.northing = northing;
		this.easting = easting;
		this.height = height;
	}
	
	public Point(Node node)
	{
		super();
		this.code = getAttr(node, "code");
		this.description = getAttr(node, "description");
		this.zone = getAttr(node, "zone");
		
		this.northing = getAttrInt(node, "northing");
		this.easting = getAttrInt(node, "easting");
		this.height = getAttrInt(node, "height");
		
	}
	
	public Point()
	{
		
	}

	private String getAttr(Node node, String name)
	{
		
		Attr at = (Attr) node.getAttributes().getNamedItem(name);
		
		if (at!=null)
			return at.getValue();
		else
			return null;
	}
	
	
	private int getAttrInt(Node node, String name)
	{
		
		String val = getAttr(node, name);
		
		
		if (val==null || val.trim().length()==0)
			return 0;
		
		return Integer.parseInt(val);
		
	}
	
	/**
	 * @return the code
	 */
	public String getCode()
	{
		return code;
	}
	/**
	 * @param code the code to set
	 */
	public void setCode(String code)
	{
		this.code = code;
	}
	/**
	 * @return the description
	 */
	public String getDescription()
	{
		return description;
	}
	/**
	 * @param description the description to set
	 */
	public void setDescription(String description)
	{
		this.description = description;
	}
	/**
	 * @return the easting
	 */
	public int getEasting()
	{
		return easting;
	}
	/**
	 * @param easting the easting to set
	 */
	public void setEasting(int easting)
	{
		this.easting = easting;
	}
	/**
	 * @return the height
	 */
	public int getHeight()
	{
		return height;
	}
	/**
	 * @param height the height to set
	 */
	public void setHeight(int height)
	{
		this.height = height;
	}
	/**
	 * @return the northing
	 */
	public int getNorthing()
	{
		return northing;
	}
	/**
	 * @param northing the northing to set
	 */
	public void setNorthing(int northing)
	{
		this.northing = northing;
	}
	/**
	 * @return the zone
	 */
	public String getZone()
	{
		return zone;
	}
	/**
	 * @param zone the zone to set
	 */
	public void setZone(String zone)
	{
		this.zone = zone;
	}

	public int compareTo(Point p)
	{
		if (this==p)
			return 0;
		
		if (p==null)
			return -1;
		
		if (this.getCode()==null)
			return 1;
		
		if (p.getCode()==null)
			return -1;
		
		return this.getCode().compareTo(p.getCode());
	}

	/**
	 * @return the url
	 */
	public String getUrl()
	{
		return url;
	}

	/**
	 * @param url the url to set
	 */
	public void setUrl(String url)
	{
		this.url = url;
	}

	/**
	 * @return the urlName
	 */
	public String getUrlName()
	{
		return urlName;
	}

	/**
	 * @param urlName the urlName to set
	 */
	public void setUrlName(String urlName)
	{
		this.urlName = urlName;
	}
	
}
