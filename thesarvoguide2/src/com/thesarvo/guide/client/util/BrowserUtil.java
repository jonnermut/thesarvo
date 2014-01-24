package com.thesarvo.guide.client.util;

import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.Window.Navigator;

public final class BrowserUtil
{

	private static Boolean mobileBrowser = null;
	

	
	public static final boolean isMobileBrowser()
	{
		//return true;
		
		
		if (mobileBrowser == null)
		{
			String ua = Navigator.getUserAgent();
			String host = Window.Location.getHostName();
		
			mobileBrowser = isIOS()
				|| ua.contains("Android") 
				||
			( (ua.contains("Chrome") || ua.contains("Safari")) && (host.contains("127.0.0.1") || host.contains("192.168"))  );
		}
		return mobileBrowser;
		
	}

	public static final boolean isAndroid()
	{
		String ua = Navigator.getUserAgent();
		return ua.contains("Android");
	}
	
	public static final boolean isIOS()
	{
		String ua = Navigator.getUserAgent();
		return ua.contains("iPhone") 
			|| ua.contains("iPod")
			|| ua.contains("iPad");
	}
}
