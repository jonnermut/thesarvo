package com.thesarvo.xphone.client.phonegap;

import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.thesarvo.xphone.client.util.BrowserUtil;

public class NativeNavigationBar
{
	PopItemHandler popItemHandler = null;
	
	public static boolean isAvailable()
	{
		return PhoneGap.isAvailable() && BrowserUtil.isIOS();
	}
	
	public NativeNavigationBar()
	{
	}
	
	public void createNavBar()
	{
		PhoneGap.exec("NativeNavigationBar.createNavBar");
		
		setupEvents(this);
	}
	
	private static native void setupEvents(NativeNavigationBar nnb) /*-{
		$wnd.uicontrols.navBarPopItem = function() { 
			//$wnd.alert("navBarPopItem:" + arguments[0] + "," + arguments[1]);
			//$wnd.alert(nnb);
			nnb.@com.thesarvo.xphone.client.phonegap.NativeNavigationBar::navBarPopItem(Ljava/lang/String;Ljava/lang/String;)(arguments[0],arguments[1]);
		};
	}-*/;
	
	protected void navBarPopItem(String idFrom, String idTo)
	{
		//Window.alert("navBarPopItem(" + idFrom + "," + idTo);
		
		if (popItemHandler!=null)
			popItemHandler.popItem(idFrom, idTo);
	}
	
	public void setNavBar(String title, String id)
	{
		JSONObject o = new JSONObject();
		if (id!=null)
			o.put("id", new JSONString(id));
		
		PhoneGap.exec("NativeNavigationBar.setNavBar", title, o.getJavaScriptObject());
	}

	public interface PopItemHandler
	{
		public void popItem(String idFrom, String idTo);
	}

	/**
	 * @return the popItemHandler
	 */
	public PopItemHandler getPopItemHandler()
	{
		return popItemHandler;
	}

	/**
	 * @param popItemHandler the popItemHandler to set
	 */
	public void setPopItemHandler(PopItemHandler popItemHandler)
	{
		this.popItemHandler = popItemHandler;
	}
}
