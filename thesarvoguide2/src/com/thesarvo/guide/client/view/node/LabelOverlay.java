//package com.thesarvo.guide.client.view.node;
//
//
//import com.google.gwt.maps.client.MapWidget;
//import com.google.gwt.maps.client.base.LatLng;
//import com.google.gwt.maps.client.base.Point;
//import com.google.gwt.user.client.Command;
//import com.google.gwt.user.client.DOM;
//import com.google.gwt.user.client.DeferredCommand;
//import com.google.gwt.user.client.ui.Label;
//import com.google.gwt.user.client.ui.Widget;
//
//
//public class LabelOverlay extends Overlay
//{
//
//
//
//
//	private LatLng pos;
//	private String text;
//
//	private MapWidget map;
//
//	private MapPane pane;
//
//	private TransparentDiv div;
//	
//	boolean leftPos = false;
//	
//	public LabelOverlay(LatLng pos, String text)
//	{
//		this.pos = pos;
//		this.text = text;
//		
//		div = new TransparentDiv();
//		div.add(new Label(text));
//		
//	}
//
//	@Override
//	protected Overlay copy()
//	{
//		return new LabelOverlay(pos, text);
//	}
//
//	@Override
//	protected void initialize(MapWidget map)
//	{
//		this.map = map;
//		pane = map.getPane(MapPaneType.MAP_PANE);
//		pane.add(div);
//	}
//
//	@Override
//	protected void redraw(boolean force)
//	{
//		// Only set the rectangle's size if the map's size has changed
//		if (!force)
//		{
//			return;
//		}
//
//		Point p = map.convertLatLngToDivPixel(pos);
//		
//		int x = p.getX();
//		int y = p.getY();
//		
//		pane.setWidgetPosition(div, x, y);
//
//		div.setVisible(true);
//		
//		div.getElement().getStyle().setZIndex(1100);
//		
//		leftPos = false;
//		
//		checkIntersects();
//	}
//
//	private void checkIntersects()
//	{
//		Command checkIntersects = new CheckIntersectsCmd();
//		DeferredCommand.addCommand(checkIntersects);
//	}
//
//	public static Bounds getBounds(Widget w)
//	{
//		int wx = DOM.getAbsoluteLeft(w.getElement());
//		int wy = DOM.getAbsoluteTop(w.getElement());
//		int wx2 = wx + w.getOffsetWidth();
//		int wy2 = wy + w.getOffsetHeight();
//		Bounds widgetBounds = Bounds.newInstance(wx, wy, wx2, wy2);
//		
//		return widgetBounds;
//	}
//	
//	public static boolean intersects(Bounds bounds1, Bounds bounds2)
//	{
//		return ! ( bounds2.getMinX() > bounds1.getMaxX()
//				|| bounds2.getMaxX() < bounds1.getMinX()
//				|| bounds2.getMinY() > bounds1.getMaxY()
//				|| bounds2.getMaxY() < bounds1.getMinY() );
//	}
//	
//
//	@Override
//	protected void remove()
//	{
//		div.removeFromParent();
//	}
//	
//	private final class CheckIntersectsCmd implements Command
//	{
//		@Override
//		public void execute()
//		{
//			Bounds divBounds = getBounds(div);
//			
//			for (int i=0; i<pane.getWidgetCount(); i++)
//			{
//				Widget w = pane.getWidget(i);
//				if (w==div)
//				{
//					break;
//				}
//				
//				Bounds widgetBounds = getBounds(w);
//				
//				if (intersects(divBounds, widgetBounds) )
//				{
//					// overlap!
//					if (!leftPos)
//					{
//						// try moving it to the left
//						int dwid = div.getOffsetWidth();
//						
//						int dx = pane.getWidgetLeft(div);
//						int dy = pane.getWidgetTop(div);
//						
//						
//						pane.setWidgetPosition(div, dx - dwid, dy);
//						//divBounds = getBounds(div);
//						divBounds = Bounds.newInstance(divBounds.getMinX() - dwid, divBounds.getMinY(), divBounds.getMaxX() - dwid, divBounds.getMaxY());
//						leftPos = true;
//						i = -1;
//						continue;
//					}
//					else
//					{
//						div.setVisible(false);
//						break;
//					}
//				}
//			}
//
//		}
//	}
//
//	/**
//	 * @return the pos
//	 */
//	public LatLng getPos()
//	{
//		return pos;
//	}
//
//	/**
//	 * @return the text
//	 */
//	public String getText()
//	{
//		return text;
//	}
//
//	/**
//	 * @param pos the pos to set
//	 */
//	public void setPos(LatLng pos)
//	{
//		this.pos = pos;
//	}
//
//	/**
//	 * @param text the text to set
//	 */
//	public void setText(String text)
//	{
//		this.text = text;
//	}
//}
