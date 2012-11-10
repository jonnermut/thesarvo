package com.thesarvo.xphone.client.mobilewebkit.touchscroll;

import com.google.gwt.core.client.GWT;
import com.google.gwt.resources.client.ClientBundle;

/**
 * Resources used by the entire application.
 */
public interface TouchScrollResources extends ClientBundle
{
	@Source("touchscroll.css")
	public TouchScrollStyle style();
	
//	@Source("touchscroll.js")
//	public DataResource touchScrollJs();

	public static TouchScrollResources INSTANCE = GWT.create(TouchScrollResources.class);
}
