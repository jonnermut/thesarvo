package com.thesarvo.guide.client.model;

import com.thesarvo.guide.client.xml.XmlSimpleModel;

public abstract class DrawingObject
{
	String id;
	String linkedTo;
	XmlSimpleModel model;
	
	public DrawingObject()
	{
	}
	
	public DrawingObject(XmlSimpleModel model)
	{
		this.model = model;
	}
	
	/**
	 * @return the id
	 */
	public String getId()
	{
		if (model != null)
		{
			return model.get("@id");
		}
		else
			return id;
	}
	/**
	 * @param id the id to set
	 */
	public void setId(String id)
	{
		if (model != null)
		{
			model.put("@id", id);
		}
		else
			this.id = id;
	}
	/**
	 * @return the linkedTo
	 */
	public String getLinkedTo()
	{
		if (model != null)
		{
			return model.get("@linkedTo");
		}
		else
			return linkedTo;
	}
	/**
	 * @param linkedTo the linkedTo to set
	 */
	public void setLinkedTo(String linkedTo)
	{
		if (model != null)
		{
			model.put("@linkedTo", linkedTo);
		}
		else
			this.linkedTo = linkedTo;
	}
	
	public abstract String getType();
	
}
