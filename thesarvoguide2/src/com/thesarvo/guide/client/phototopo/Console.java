package com.thesarvo.guide.client.phototopo;

import com.google.gwt.core.client.JavaScriptObject;

public class Console
{
	public static final native void log(String msg) /*-{
		if ($wnd.console)
			$wnd.console.log(msg);
	}-*/;

	public static final native void log(JavaScriptObject obj) /*-{
		if ($wnd.console)
			$wnd.console.log(obj);
	}-*/;

	public static final native void log(boolean val) /*-{
		if ($wnd.console)
			$wnd.console.log(val);
	}-*/;

	public static final native void log(int val) /*-{
		if ($wnd.console)
			$wnd.console.log(val);
	}-*/;

	public static final native void log(Object obj) /*-{
		if ($wnd.console)
			$wnd.console.log(obj);
	}-*/;
}
