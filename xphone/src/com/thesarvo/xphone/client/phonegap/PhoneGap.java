package com.thesarvo.xphone.client.phonegap;

import com.google.gwt.core.client.JavaScriptObject;

public abstract class PhoneGap
{

	public static boolean isAvailable()
	{
		return available();
	}
	
	public static void log(String msg)
	{
		if (isAvailable())
			doLog(msg);
	}
	
	private native static void doLog(String msg) /*-{
		$wnd.debug.log(msg);
	}-*/;
	
	private native static boolean available() /*-{
		return $wnd.PhoneGap && $wnd.PhoneGap.available;
	}-*/;
	
	public static native JavaScriptObject exec(String cmd) /*-{
		$wnd.PhoneGap.exec(cmd);
	}-*/;
	
	public static native JavaScriptObject exec(String cmd, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, options);
	}-*/;
	
	public static native JavaScriptObject exec(String cmd, Object arg1) /*-{
		$wnd.PhoneGap.exec(cmd, arg1);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, options);
	}-*/;
	
	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, options);
	}-*/;	
	
	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, options);
	}-*/;	
	
	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4, options);
	}-*/;	
	
	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4, arg5);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4, arg5, options);
	}-*/;	
	
	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5, Object arg6) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4, arg5, arg6);
	}-*/;	

	public static native JavaScriptObject exec(String cmd, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5, Object arg6, JavaScriptObject options) /*-{
		$wnd.PhoneGap.exec(cmd, arg1, arg2, arg3, arg4, arg5, arg6, options);
	}-*/;	
}
