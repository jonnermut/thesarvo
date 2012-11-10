package com.thesarvo.xphone.client.mobilewebkit;

import com.thesarvo.xphone.client.util.BrowserUtil;
import com.thesarvo.xphone.client.util.Logger;



public abstract class TouchUtil
{
	static Boolean touchAvailable = null;
	
	public static boolean isTouchAvailable()
	{
		//return BrowserUtil.isMobileBrowser();
		if (touchAvailable == null)
		{
			
			//touchAvailable = touchAvailable();
			
			touchAvailable = BrowserUtil.isIOS() || BrowserUtil.isAndroid();
			
			Logger.debug("TouchUtil.touchAvailable=" + touchAvailable);
			
		}
		
		return touchAvailable;
	}
	
	private static native boolean touchAvailable() /*-{
		return ( 'createTouch' in document );
	}-*/;
}

