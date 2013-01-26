package com.thesarvo.guide.client.model;

import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.phototopo.Console;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public abstract class DrawingObject
{
	String id;
	String linkedTo;
	String lineStyle;
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
	

	/**
	 * @return the lineStyle
	 */
	public String getLineStyle()
	{
		if (model != null)
		{
			return model.get("@lineStyle");
		}
		else
			return lineStyle;
	}
	/**
	 * @param lineStyle the lineStyle to set
	 */
	public void setLineStyle(String lineStyle)
	{
		if (model != null)
		{
			model.put("@lineStyle", lineStyle);
		}
		else
			this.lineStyle = lineStyle;
	}

	public abstract String getType();
	
	public void remove()
	{
		if (model != null)
		{
			Node p = model.getNode().getParentNode();
			if (p!=null)
				p.removeChild(model.getNode());
			
			Console.log("DrawingObject removed, parent xml is now: \n" + p.toString());
		}
		
	}
	
}
