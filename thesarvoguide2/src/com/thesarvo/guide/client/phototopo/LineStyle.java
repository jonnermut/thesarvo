package com.thesarvo.guide.client.phototopo;

public enum LineStyle
{
	solid("Solid"),
	dashed("Dashed"),
	dotted("Dotted");
	
	private String description;

	LineStyle(String desc)
	{
		this.description = desc;
	}
	
	public String getDescription()
	{
		return description;
	}
}
