package com.thesarvo.guide.client.phototopo;

import com.google.gwt.dom.client.Style.Cursor;
import com.thesarvo.guide.client.raphael.Attr;
import com.thesarvo.guide.client.raphael.Raphael.Rect;
import com.thesarvo.guide.client.raphael.Raphael.Text;


public enum RectStyle
{
	black_text_on_solid_white(false),
	white_text_on_solid_black(false),
	black_text_on_solid_yellow(false),
	white_outline(true),
	yellow_outline(true);
	
	boolean outline;
	
	private RectStyle(boolean outline)
	{
		this.outline = outline;
	}
	
	public boolean isOutline()
	{
		return outline;
	}
	
	public void style(Rect rect, Text text, boolean editable)
	{
		
		Attr rectAttr = new Attr()
						.r(4)
						.strokeWidth(1)
						.opacity(0.9);
		Attr textAttr = new Attr()
						.fontFamily("Tahoma, Helvetica")
						.fontSize(12);

		if (editable)
		{
			rectAttr.cursor(Cursor.MOVE);
			textAttr.cursor(Cursor.MOVE);
		}
		
		switch (this)
		{
			case black_text_on_solid_white:
				rectAttr.fill("white")
						.stroke("black");
				textAttr.fill("black");		
				break;

			case white_text_on_solid_black:
				rectAttr.fill("black")
						.stroke("black");
				textAttr.fill("white");		
				break;	

			case black_text_on_solid_yellow:
				rectAttr.fill("#F7941E")
						.stroke("white");
				textAttr.fill("black");		
				break;		
				
			case yellow_outline:
				rectAttr.fill("none")
						.stroke("#F7941E")
						.strokeWidth(3);
						//.strokeDash("..");
				textAttr.fill("black");		
				break;

			case white_outline:
				rectAttr.fill("none")
						.stroke("white")
						.strokeWidth(3);
						//.strokeDash("--");
				textAttr.fill("black");		
				break;	
				
			default:
				break;
		
		}
		
		if (rect != null)
			rect.attr(rectAttr);
		if (text != null)
			text.attr(textAttr);
	}
}