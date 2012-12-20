package com.thesarvo.guide.client.model;

public class Attachment
{
	String name;

	String src;
	
	public Attachment(String name, String src)
	{
		super();
		this.name = name;
		this.src = src;
	}	
	
	/**
	 * @return the name
	 */
	public String getName()
	{
		return name;
	}
	/**
	 * @param name the name to set
	 */
	public void setName(String name)
	{
		this.name = name;
	}
	/**
	 * @return the src
	 */
	public String getSrc()
	{
		return src;
	}
	/**
	 * @param src the src to set
	 */
	public void setSrc(String src)
	{
		this.src = src;
	}
	
}	
