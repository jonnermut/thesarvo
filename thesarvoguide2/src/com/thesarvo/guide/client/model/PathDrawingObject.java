package com.thesarvo.guide.client.model;

import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class PathDrawingObject extends DrawingObject
{
	String points = "";
	String svgPath = ""; //d
	

	private String labelText;
	private String labelClasses;
	
	Boolean arrow = false;
	
	public PathDrawingObject(XmlSimpleModel xsm)
	{
		super(xsm);
	}
	public PathDrawingObject()
	{
	}
	/**
	 * @return the points
	 */
	public String getPoints()
	{
		if (model != null)
			return model.get("@points");
		
		return points;
	}
	/**
	 * @param points the points to set
	 */
	public void setPoints(String points)
	{
		if (model != null)
			model.put("@points", points);
		
		this.points = points;
	}
	/**
	 * @return the svgPath
	 */
	public String getSvgPath()
	{
		if (model != null)
			return model.get("@d");

		
		return svgPath;
	}
	/**
	 * @param svgPath the svgPath to set
	 */
	public void setSvgPath(String svgPath)
	{
		if (model != null)
			model.put("@d", svgPath);
		else
			this.svgPath = svgPath;
	}
	
	@Override
	public String getType()
	{
		return "path";
	}
	
	public String getLabelText()
	{
		String linkedTo = getLinkedTo();
		if (StringUtil.isNotEmpty(linkedTo))
		{
			Node climb = Controller.get().getNode(linkedTo);
			if (climb != null)
			{
				String ret = XPath.getAttr(climb, "@number");
				if (ret != null)
				{
					if (ret.endsWith("."))
						ret = ret.substring(0, ret.length()-1);
					
					return ret;
				}
				else
					return "";
			}
		}
		else if (model != null)
		{
			return model.get("@labelText");
		}
		return labelText;
	}

	public boolean isSportClimb()
	{
		String boltchar = new String( new char[] {(char) 222} ) ;

		String linkedTo = getLinkedTo();
		if (StringUtil.isNotEmpty(linkedTo))
		{
			Node climb = Controller.get().getNode(linkedTo);
			if (climb != null)
			{
				String ret = XPath.getAttr(climb, "@extra");
				if (ret != null)
				{
						
					if (ret.contains(boltchar) || ret.contains("B") )
						return true;
				}
			}
		}
		return false;
		
			
	}
	
	public void setLabelText(String labelText)
	{
		String linkedTo = getLinkedTo();
		if (StringUtil.isNotEmpty(linkedTo))
		{
			Node climb = Controller.get().getNode(linkedTo);
			if (climb != null)
			{
				if (!labelText.endsWith("."))
					labelText += ".";
				
				XPath.setAttr(climb, "@number", labelText);
				
			}
		}
		else if (model != null)
		{
			model.put("@labelText", labelText);
		}
		else
			this.labelText = labelText;
	}

	public String getLabelClasses()
	{
		return labelClasses;
	}

	public void setLabelClasses(String labelClasses)
	{
		this.labelClasses = labelClasses;
	}
	/**
	 * @return the arrow
	 */
	public Boolean getArrow()
	{
		if (model != null)
			return model.getBoolean("@arrow");
		return false;
	}
	
			

	
	/**
	 * @param arrow the arrow to set
	 */
	public void setArrow(Boolean arrow)
	{
		if (model != null)
			model.put("@arrow", "" + arrow);
	}
	
}
