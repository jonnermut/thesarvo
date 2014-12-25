package com.thesarvo.guide.client.model;

import com.thesarvo.guide.client.phototopo.ArrowDirection;
import com.thesarvo.guide.client.phototopo.RectStyle;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class RectDrawingObject extends DrawingObject
{
	int x,y,width,height;
	
	RectStyle style = RectStyle.yellow_outline;
	ArrowDirection arrowDirection = ArrowDirection.none;
	String text;
	
	
	
	public RectDrawingObject(XmlSimpleModel xsm)
	{
		super(xsm);
	}
	public RectDrawingObject()
	{
	}
	/**
	 * @return the x
	 */
	public int getX()
	{
		if (model != null)
			return model.getInt("@x");
		
		return x;
	}
	/**
	 * @param x the x to set
	 */
	public void setX(int x)
	{
		if (model != null)
			model.put("@x", "" + x);
		
		this.x = x;
	}
	/**
	 * @return the y
	 */
	public int getY()
	{
		if (model != null)
			return model.getInt("@y");

		
		return y;
	}
	/**
	 * @param y the y to set
	 */
	public void setY(int y)
	{
		if (model != null)
			model.put("@y", "" + y);

		
		this.y = y;
	}
	/**
	 * @return the width
	 */
	public int getWidth()
	{
		if (model != null)
			return model.getInt("@width");
		
		return width;
	}
	/**
	 * @param width the width to set
	 */
	public void setWidth(int width)
	{
		if (model != null)
			model.put("@width", "" + width);

		
		this.width = width;
	}
	/**
	 * @return the height
	 */
	public int getHeight()
	{
		if (model != null)
			return model.getInt("@height");
		
		return height;
	}
	/**
	 * @param height the height to set
	 */
	public void setHeight(int height)
	{
		if (model != null)
			model.put("@height", "" + height);

		
		this.height = height;
	}
	/**
	 * @return the style
	 */
	public RectStyle getStyle()
	{
		if (model != null)
		{
			String val = model.get("@style");
			if (StringUtil.isNotEmpty(val))
				return RectStyle.valueOf(val);
		}
		
		return style;
	}
	/**
	 * @param style the style to set
	 */
	public void setStyle(RectStyle style)
	{
		if (model != null)
		{
			model.put("@style", style.name());
		}
		else
			this.style = style;
	}
	/**
	 * @return the arrowDirection
	 */
	public ArrowDirection getArrowDirection()
	{
		if (model != null)
		{
			String val = model.get("@arrowDirection");
			if (StringUtil.isNotEmpty(val))
				return ArrowDirection.valueOf(val);
		}
		
		return arrowDirection;
	}
	/**
	 * @param arrowDirection the arrowDirection to set
	 */
	public void setArrowDirection(ArrowDirection arrowDirection)
	{
		if (model != null)
		{
			model.put("@arrowDirection", arrowDirection.name());
		}
		
		this.arrowDirection = arrowDirection;
	}

	@Override
	public String getType()
	{
		return "rect";
	}
	/**
	 * @return the text
	 */
	public String getText()
	{
		String ret = "";
		
		if (model != null)
			ret = model.get("@text");
		else
			ret =  text;
		
		if (ret != null)
			ret = ret.replace("<br/>", "\n");
		
		return ret;
	}
	/**
	 * @param text the text to set
	 */
	public void setText(String text)
	{
		if (text != null)
			text = text.replace("\n", "<br/>");
		
		if (model != null)
		{
			model.put("@text", text);
		}
		else
			this.text = text;
	}

}
