package com.thesarvo.xphone.client.util;



import com.allen_sauer.gwt.log.client.Log;
import com.thesarvo.xphone.client.phonegap.PhoneGap;

public abstract class Logger
{
	public static void debug(String msg)
	{
		Log.debug(msg);
		//PhoneGap.log(msg);
	}
	
	public static void error(String msg, Throwable t)
	{
		Log.error(msg, t);
		PhoneGap.log(msg);
		if (t!=null)
			PhoneGap.log(t.toString());
	}
}
