package com.thesarvo.guide.client.phototopo;

import com.google.gwt.dom.client.NativeEvent;
import com.google.gwt.dom.client.Style.Cursor;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.Window;
import com.thesarvo.guide.client.model.RectDrawingObject;
import com.thesarvo.guide.client.raphael.Attr;
import com.thesarvo.guide.client.raphael.BBox;
import com.thesarvo.guide.client.raphael.ClickCallback;
import com.thesarvo.guide.client.raphael.DragCallback;
import com.thesarvo.guide.client.raphael.Raphael.Circle;
import com.thesarvo.guide.client.raphael.Raphael.Path;
import com.thesarvo.guide.client.raphael.Raphael.Rect;
import com.thesarvo.guide.client.raphael.Raphael.Text;

public class RectWithText
{


	private static final int PADDING = 8;
	Rect mainRect;
	Text mainText;
	Rect textBackgroundRect;
	
	
	
	Circle nwHandle = null;
	Circle neHandle = null;
	Circle swHandle = null;
	Circle seHandle = null;
	boolean handlesCreated = false;
	
	PhotoTopo phototopo;
	RectDrawingObject data;
	
	//RectWithTextData data = new RectWithTextData("", ArrowDirection.none);
	Path arrowPath;
	

	
	public RectWithText(PhotoTopo photoTopo2, RectDrawingObject rdo)
	{
		this.phototopo = photoTopo2;
		this.data = rdo;
	}

	public void init()
	{
		redraw();
	}
	
	public void redraw()
	{
		if (mainRect != null)
			mainRect.remove();
		if (mainText != null)
			mainText.remove();

		SimplePoint tp = calcTextPosition();
		mainText = phototopo.text((int) tp.x, (int) tp.y, data.getText() );		
		
		boolean autosize = isAutosize();
		boolean editable = phototopo.getOptions().editable;
			
		mainRect = phototopo.rect(data.getX(), data.getY(), data.getWidth(), data.getHeight());
		data.getStyle().style(mainRect, mainText, editable);
		
		autosizeIfNecessary();
		createBackgroundRectIfNecessary();
		redrawArrowIfNecessary();
			
		mainText.toFront();
		
		if (!autosize)
		{
			if (editable)
			{
				removeHandles();
				
				ClickCallback cc = new ClickCallback()
				{
					
					@Override
					public void onClick(Event e)
					{
						e.stopPropagation();
						
					}
				};
				
				nwHandle = phototopo.circle(data.getX(), data.getY(), PhotoTopo.HANDLE_RADIUS);
				nwHandle.attr(Styles.handle());
				nwHandle.drag(new HandleDragCallback(new int[] {1,1,-1,-1} ));
				nwHandle.attr(new Attr().cursor(Cursor.NW_RESIZE));
				nwHandle.click(cc);

				neHandle = phototopo.circle(data.getX()+data.getWidth(), data.getY(), PhotoTopo.HANDLE_RADIUS);
				neHandle.attr(Styles.handle());
				neHandle.drag(new HandleDragCallback(new int[] {0,1,1,-1} ));
				neHandle.attr(new Attr().cursor(Cursor.NE_RESIZE));
				neHandle.click(cc);
				
				seHandle = phototopo.circle(data.getX()+data.getWidth(), data.getY()+data.getHeight(), PhotoTopo.HANDLE_RADIUS);
				seHandle.attr(Styles.handle());
				seHandle.drag(new HandleDragCallback(new int[] {0,0,1,1} ));
				seHandle.attr(new Attr().cursor(Cursor.SE_RESIZE));
				seHandle.click(cc);

				swHandle = phototopo.circle(data.getX(), data.getY()+data.getHeight(), PhotoTopo.HANDLE_RADIUS);
				swHandle.attr(Styles.handle());
				swHandle.drag(new HandleDragCallback(new int[] {1,0,-1,1} ));
				swHandle.attr(new Attr().cursor(Cursor.SW_RESIZE));
				swHandle.click(cc);
				
				handlesCreated = true;
			}
		}
		

		if (editable)
		{
			HandleDragCallback moveCallback = new HandleDragCallback(new int[] {1,1,0,0} );
			ClickCallback selectCallback = new ClickCallback()
			{
				
				@Override
				public void onClick(Event e)
				{
					Console.log("rect click");
					e.stopPropagation();
					phototopo.setSelectedRectWithText(RectWithText.this);
				}
			};
			
			mainRect.drag(moveCallback);
			mainRect.click(selectCallback);
			mainText.drag(moveCallback);
			mainText.click(selectCallback);
			if (textBackgroundRect != null)
			{
				textBackgroundRect.drag(moveCallback);
				textBackgroundRect.click(selectCallback);
			}
		}
		
	}

	private void redrawArrowIfNecessary()
	{
		if (arrowPath != null)
			arrowPath.remove();
		
		if (data.getArrowDirection() != data.getArrowDirection().none)
		{
			int x1=data.getX(),y1=data.getY(),x2=data.getX(),y2=data.getY();
			int midx = data.getX()+data.getWidth()/2;
			int farx = data.getX()+data.getWidth();
			int midy = data.getY()+data.getHeight()/2;
			int fary = data.getY()+data.getHeight();
			int len = 30;
			
			switch (data.getArrowDirection())
			{
				case north:
					x1 = midx;
					y1 = data.getY();
					x2 = x1;
					y2 = y1-len;
					break;
					
				case north_east:
					x1 = farx;
					y1 = data.getY();
					x2 = x1 + len;
					y2 = y1 - len;
					break;
					
				case east:
					x1 = farx;
					y1 = midy;
					x2 = x1 + len;
					y2 = y1;
					break;
					
				case south_east:
					x1 = farx;
					y1 = fary;
					x2 = x1 + len;
					y2 = y1 + len;
					break;
					
				case south:
					x1 = midx;
					y1 = fary;
					x2 = x1;
					y2 = y1+len;
					break;
					
				case south_west:
					x1 = data.getX();
					y1 = fary;
					x2 = x1 - len;
					y2 = y1 + len;
					break;
					
				case west:
					x1 = data.getX();
					y1 = midy;
					x2 = x1 - len;
					y2 = y1;
					break;
					
				case north_west:
					x1 = data.getX();
					y1 = data.getY();
					x2 = x1 - len;
					y2 = y1 - len;
					break;
					
			}
			
			String arrowSvg = "M" + x1 + "," + y1 + " L" + x2 + "," + y2;
			arrowPath = phototopo.path(arrowSvg);
			
			Attr attr =  new Attr()
						.strokeWidth(4)
						.arrowEnd("block-medium-medium")
						.fill("none");
			
			if (data.getStyle().isOutline())
			{
				attr.stroke(mainRect.attrAsString("stroke"));
			}
			else
			{
				attr.stroke(mainRect.attrAsString("fill"));
			}
					
			arrowPath.attr( attr );
			
		}
		
	}

	private void createBackgroundRectIfNecessary()
	{
		if (textBackgroundRect != null)
			textBackgroundRect.remove();
		
		if (!isAutosize())
		{
			BBox textBox = mainText.getBBox();
			
			textBackgroundRect = phototopo.rect(data.getX(), data.getY(), data.getWidth(), (int) textBox.height() + PADDING);
			
			Attr attr = new Attr().stroke("none")
					.fill(mainRect.attrAsString("stroke"));
			
			if (phototopo.getOptions().editable)
				attr.cursor(Cursor.MOVE);
			
			textBackgroundRect.attr(attr );
			
			
		}
		
		
	}

	public void autosizeIfNecessary()
	{
		if (isAutosize())
		{
			BBox textBox = mainText.getBBox();

			if (phototopo.isEditable())
			{
				data.setWidth((int) textBox.width() + PADDING);
		
				data.setHeight((int) textBox.height() + PADDING);
			}
			
			setRectAndTextPosition();
			
		}
	}

	public boolean isAutosize()
	{
		return data.getStyle() == RectStyle.black_text_on_solid_white || data.getStyle() == RectStyle.black_text_on_solid_yellow || data.getStyle() == RectStyle.white_text_on_solid_black;
	}

	public void removeHandles()
	{
		if (handlesCreated)
		{
			nwHandle.remove();
			neHandle.remove();
			seHandle.remove();
			swHandle.remove();
			
			nwHandle = null;
			neHandle = null;
			seHandle = null;
			swHandle = null;
			
			handlesCreated = false;
		}

	}
	
	private void setTextPosition()
	{
		SimplePoint sp = calcTextPosition();
		if (mainText != null)
		{
			mainText.attr("x", sp.x);
			mainText.attr("y", sp.y);
		}
		
	}
	
	private void setRectAndTextPosition()
	{
		if (mainRect != null)
		{
			mainRect.attr("x", data.getX())
				.attr("y", data.getY())
				.attr("height", data.getHeight())
				.attr("width", data.getWidth());
			
			Console.log("setRectAndTextPosition(" + data.getX() + "," + data.getY() + "," + data.getWidth() + "," + data.getHeight() + ")");
			//mainRect.attr(new Attr().x(x).y(y).height(height).width(width));
		}
		setTextPosition();
		setHandlePositions();

		if (textBackgroundRect != null)
		{
			BBox textBox = mainText.getBBox();
			
			textBackgroundRect.attr(new Attr().x(data.getX()).y(data.getY()).width(data.getWidth()).height( (int) textBox.height() + PADDING) );
		}
		redrawArrowIfNecessary();
	}

	public void setHandlePositions()
	{
		if (handlesCreated)
		{
			if (nwHandle != null)
				nwHandle.attr("cx", data.getX()).attr("cy", data.getY());
			if (neHandle != null)
				neHandle.attr("cx", data.getX() + data.getWidth()).attr("cy", data.getY());
			if (seHandle != null)
				seHandle.attr("cx", data.getX() + data.getWidth()).attr("cy", data.getY() + data.getHeight());
			if (swHandle != null)
				swHandle.attr("cx", data.getX() ).attr("cy", data.getY() + data.getHeight());
		}
	}

	SimplePoint calcTextPosition()
	{
		double tx = data.getX() + data.getWidth() /2;
		double ty = data.getY() + data.getHeight() /2;
		
		if (!isAutosize())
			ty = data.getY() + PADDING /2;
		
		return new SimplePoint(tx,  ty);
	}

	/**
	 * @return the text
	 */
	public String getText()
	{
		return data.getText();
	}

	/**
	 * @param text the text to set
	 */
	public void setText(String text)
	{
		this.data.setText(text);
		
		if (mainText != null)
		{
			mainText.attr("text", text);
			autosizeIfNecessary();
			setTextPosition();
		}
	}

	/**
	 * @return the style
	 */
	public RectStyle getStyle()
	{
		return data.getStyle();
	}

	/**
	 * @param style the style to set
	 */
	public void setStyle(RectStyle style)
	{
		this.data.setStyle(style);
		
		redraw();
	}
	
	
	private final class HandleDragCallback implements DragCallback
	{
		int ox,oy,ow,oh;
		int[] matrix;
		
		public HandleDragCallback(int[] matrix)
		{
			this.matrix = matrix;
		}

		@Override
		public void onStart(double ax, double ay)
		{
			Console.log("HandleDragCallback onStart");
			
			ox = data.getX();
			oy = data.getY();
			oh = data.getHeight();
			ow = data.getWidth();
			
		}

		@Override
		public void onMove(double dx, double dy, double ax, double ay)
		{
			Console.log("HandleDragCallback onMove dx=" + dx + ", dy=" + dy);
			
			data.setX((int) (ox + matrix[0]*dx));
			data.setY((int) (oy +  matrix[1]*dy));
			data.setWidth((int) (ow + matrix[2]*dx));
			data.setHeight((int) (oh + matrix[3]*dy));
			Console.log("width=" + data.getWidth() + ", ow=" + ow + " dy="+dx);
			setRectAndTextPosition();
		}

		@Override
		public void onEnd()
		{
			//redraw();
			Console.log("HandleDragCallback onEnd");
			Console.log("HandleDragCallback onEnd event=" + Event.getCurrentEvent() );
		}
	}


	public void remove()
	{
		removeHandles();
		if (mainText != null)
			mainText.remove();
		mainText = null;
		
		if (mainRect != null)
			mainRect.remove();
		mainRect = null;
		
		if (textBackgroundRect != null)
			textBackgroundRect.remove();
		textBackgroundRect = null;
		
		if (data != null)
			data.remove();
	}

	/**
	 * @return the arrowDirection
	 */
	public ArrowDirection getArrowDirection()
	{
		return data.getArrowDirection();
	}

	/**
	 * @param arrowDirection the arrowDirection to set
	 */
	public void setArrowDirection(ArrowDirection arrowDirection)
	{
		this.data.setArrowDirection(arrowDirection);
		redrawArrowIfNecessary();
	}
}
