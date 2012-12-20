package com.thesarvo.guide.client.phototopo;

public class Console
{
	public static final native void log(String msg) /*-{
													if ($wnd.console)
													$wnd.console.log(msg);
													}-*/;
}
