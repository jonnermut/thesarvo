package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.EventTarget;

public class Touch extends JavaScriptObject
{

	protected Touch()
	{
	}

	public final native EventTarget getTarget() /*-{
	    return this.target;
	}-*/;
	
	public final native int getPageX() /*-{
		return this.pageX;
	}-*/;

	public final native int getPageY() /*-{
	return this.pageY;
	}-*/;

	
	public final native int getClientX() /*-{
	return this.clientX;
	}-*/;
	
	public final native int getClientY() /*-{
	return this.clientY;
	}-*/;

	public final native int getScreenX() /*-{
	return this.screenX;
	}-*/;
	
	public final native int getScreenY() /*-{
	return this.screenY;
	}-*/;

	public final native int getIdentifier() /*-{
	return this.identifier;
	}-*/;
	
	
}
