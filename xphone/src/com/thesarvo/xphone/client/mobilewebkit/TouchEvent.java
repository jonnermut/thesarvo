package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.core.client.JsArray;
import com.google.gwt.dom.client.NativeEvent;
import com.google.gwt.event.dom.client.DomEvent;
import com.google.gwt.event.shared.EventHandler;

public abstract class TouchEvent<H extends EventHandler> extends DomEvent<H>
{
	public JsArray<Touch> getTouches()
	{
		return touches(getNativeEvent());
	}

	private native JsArray<Touch> touches(NativeEvent nativeEvent) /*-{
		return nativeEvent.touches;
	}-*/;
}
