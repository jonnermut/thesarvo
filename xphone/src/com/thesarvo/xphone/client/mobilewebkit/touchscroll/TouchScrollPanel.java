package com.thesarvo.xphone.client.mobilewebkit.touchscroll;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.NativeEvent;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.xphone.client.mobilewebkit.TouchEndEvent;
import com.thesarvo.xphone.client.mobilewebkit.TouchEndHandler;
import com.thesarvo.xphone.client.mobilewebkit.TouchMoveEvent;
import com.thesarvo.xphone.client.mobilewebkit.TouchMoveHandler;
import com.thesarvo.xphone.client.mobilewebkit.TouchPanel;
import com.thesarvo.xphone.client.mobilewebkit.TouchStartEvent;
import com.thesarvo.xphone.client.mobilewebkit.TouchStartHandler;

public class TouchScrollPanel extends TouchPanel
{
	static
	{
//		/TouchScrollResources.INSTANCE.style().ensureInjected();
	}
	
	Element inner;
	
	JavaScriptObject scroller;

	
	public TouchScrollPanel()
	{
		addStyleName("touchScrollOuter");
		
		inner = DOM.createDiv();
		//inner.getStyle().setPosition(Position.RELATIVE);
		getElement().appendChild(inner);

		inner.setClassName("touchScroller");
		
		scroller = setupTouchScroll(inner);
			
		getTouchManager().addTouchStartHandler(new TouchStartHandler()
		{
			@Override
			public void onTouchStart(TouchStartEvent event)
			{
				handleEvent(scroller, event.getNativeEvent());
			}
		});
		getTouchManager().addTouchMoveHandler(new TouchMoveHandler()
		{
			@Override
			public void onTouchMove(TouchMoveEvent event)
			{
				handleEvent(scroller, event.getNativeEvent());	
			}
		});
		getTouchManager().addTouchEndHandler(new TouchEndHandler()
		{
			@Override
			public void onTouchEnd(TouchEndEvent event)
			{
				handleEvent(scroller, event.getNativeEvent());
			}
		});
	}
	
	
	@Override
	public void add(Widget w)
	{
		add(w, inner);
	}

	public void insert(Widget w, int beforeIndex)
	{
		insert(w, inner, beforeIndex, true);
	}

	public void setText(String string)
	{
		inner.setInnerText(string);
		
	}
	
	public static native JavaScriptObject setupTouchScroll(com.google.gwt.dom.client.Element element) /*-{
		var options = {};
		var scroller = new $wnd.TouchScroll(element, options);
		return scroller;
	}-*/;

	private static native void handleEvent(JavaScriptObject scroller, NativeEvent event) /*-{
		scroller.handleEvent(event);
	}-*/;
}
