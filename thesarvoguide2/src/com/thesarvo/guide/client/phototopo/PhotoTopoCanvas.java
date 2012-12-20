package com.thesarvo.guide.client.phototopo;

import com.thesarvo.guide.client.raphael.Raphael;
import com.thesarvo.guide.client.raphael.Raphael.Circle;
import com.thesarvo.guide.client.raphael.Raphael.Image;
import com.thesarvo.guide.client.raphael.Raphael.Rect;
import com.thesarvo.guide.client.raphael.Raphael.Text;

public class PhotoTopoCanvas extends Raphael
{

	public PhotoTopoCanvas(int width, int height)
	{
		super(width, height);
		
	}
	
	public Rect rect(int x, int y, int w, int h)
	{
		return new Rect(x, y, w, h);
	}


	public Circle circle(double x, double y, int r)
	{
		return new Circle(x, y, r);
	}

	public Path path(String p)
	{
		return new Path(p);
	}

	public Image image(String src, double x, double y, double width,
			double height)
	{
		return new Image(src, x, y, width, height);
	}

	public Text text(double x, double y, String text)
	{
		return new Text(x, y, text);
	}

	public String getSvg()
	{
		return getElement().getInnerHTML();
	}
}
