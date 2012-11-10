package com.thesarvo.xphone.client.phonegap;

import java.util.HashMap;
import java.util.Map;

import com.google.gwt.event.shared.EventHandler;
import com.thesarvo.xphone.client.util.BrowserUtil;

public class NativeMap
{
	private static final String COMMAND_PREFIX = "NativeMap.";
	
	public static final String MAP_TYPE_HYBRID = "hybrid";
	public static final String MAP_TYPE_SATELLITE = "satellite";
	public static final String MAP_TYPE_STANDARD = "standard";
	
	//HandlerManager handlerManager = new HandlerManager(this);
	Map<Integer, MapPointTouchHandler> handlers = null;
	
	public static boolean isAvailable()
	{
		return PhoneGap.isAvailable() && BrowserUtil.isIOS();
	}
	
	public void reset()
	{
		PhoneGap.exec(COMMAND_PREFIX + "reset");
	}
	
	public void init()
	{
		PhoneGap.exec(COMMAND_PREFIX + "init");
	}
	
	public void center(double latitude, double longitude, double lat_span, double long_span)
	{
		PhoneGap.exec(COMMAND_PREFIX + "center", Double.toString(latitude), Double.toString(longitude), Double.toString(lat_span), Double.toString(long_span) );
	}
	
	public void setMapType(String type)
	{
		PhoneGap.exec(COMMAND_PREFIX + "setMapType", type);
	}
	
	public void addPoint(double latitude, double longitude, String title, String subtitle, String color, MapPointTouchHandler handler)
	{
		if (handler == null)
			PhoneGap.exec(COMMAND_PREFIX + "addPoint", Double.toString(latitude), Double.toString(longitude), title, subtitle, color);
		else
		{
			// save handler for later - use hash as id
			getHandlers().put(handler.hashCode(), handler);
			
			PhoneGap.exec(COMMAND_PREFIX + "addPoint", Double.toString(latitude), Double.toString(longitude), title, subtitle, color, Integer.toString( handler.hashCode() ) );
		}
	}

	private static native void setupEvents(NativeMap nm) /*-{
		$wnd.uicontrols.mapPointTouch = function() { 
			nm.@com.thesarvo.xphone.client.phonegap.NativeMap::mapPointTouch(Ljava/lang/Integer;)(arguments[0]);
		};
	}-*/;
	
	
	protected void mapPointTouch(Integer handlerId)
	{		
		MapPointTouchHandler handler = getHandlers().get(handlerId);
		if (handler!=null)
			handler.onMapPointTouch();
	}
	
	/**
	 * @return the handlers
	 */
	public Map<Integer, MapPointTouchHandler> getHandlers()
	{
		if (handlers==null)
			handlers = new HashMap<Integer, MapPointTouchHandler>(2);
		
		return handlers;
	}
	
	public void centerAndZoomToAnnotations()
	{
		PhoneGap.exec(COMMAND_PREFIX + "centerAndZoomToAnnotations");
	}
	

	
	public void setShowsUserLocation(boolean bool)
	{
		PhoneGap.exec(COMMAND_PREFIX + "setShowsUserLocation", Boolean.toString(bool));
	}
	
	
	
	public interface MapPointTouchHandler extends EventHandler
	{
		public void onMapPointTouch(); // TODO - event obj
	}
	

	
}
