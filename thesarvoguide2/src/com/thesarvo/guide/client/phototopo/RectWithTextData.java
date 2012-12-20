package com.thesarvo.guide.client.phototopo;

public class RectWithTextData
{
	private String text;
	private int x;
	private int y;
	private int width;
	private int height;
	private RectStyle style;
	private ArrowDirection arrowDirection;

	public RectWithTextData(String text, ArrowDirection arrowDirection)
	{
		this.text = text;
		this.arrowDirection = arrowDirection;
	}

	public String getText()
	{
		return text;
	}

	public void setText(String text)
	{
		this.text = text;
	}

	public int getX()
	{
		return x;
	}

	public void setX(int x)
	{
		this.x = x;
	}

	public int getY()
	{
		return y;
	}

	public void setY(int y)
	{
		this.y = y;
	}

	public int getWidth()
	{
		return width;
	}

	public void setWidth(int width)
	{
		this.width = width;
	}

	public int getHeight()
	{
		return height;
	}

	public void setHeight(int height)
	{
		this.height = height;
	}

	public RectStyle getStyle()
	{
		return style;
	}

	public void setStyle(RectStyle style)
	{
		this.style = style;
	}

	public ArrowDirection getArrowDirection()
	{
		return arrowDirection;
	}

	public void setArrowDirection(ArrowDirection arrowDirection)
	{
		this.arrowDirection = arrowDirection;
	}
}