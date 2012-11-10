package com.thesarvo.xphone.client.ui.theme;

import com.google.gwt.resources.client.ClientBundle;

/**
 * Resources used by the entire application.
 */
public interface Resources extends ClientBundle
{
	@Source("XphoneStyle.css")
	public XphoneStyle xphoneStyle();
	
	@Source("apple/theme.css")
	public ThemeStyle themeStyle();
	
//	@Source("zzz.jpg");
//	ImageResource logo();


}
