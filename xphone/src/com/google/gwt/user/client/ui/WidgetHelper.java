package com.google.gwt.user.client.ui;

import com.google.gwt.event.dom.client.DomEvent;
import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.HandlerRegistration;

public abstract class WidgetHelper
{
	public static final <H extends EventHandler> HandlerRegistration addDomHandler(
		      Widget w, final H handler, DomEvent.Type<H> type) 
	{
		return w.addDomHandler(handler, type);
	}
}
