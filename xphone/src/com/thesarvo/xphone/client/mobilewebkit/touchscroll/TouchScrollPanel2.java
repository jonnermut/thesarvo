//package com.thesarvo.xphone.client.mobilewebkit.touchscroll;
//
//import com.google.gwt.core.client.JavaScriptObject;
//import com.google.gwt.user.client.DOM;
//import com.google.gwt.user.client.ui.Widget;
//import com.thesarvo.xphone.client.mobilewebkit.TouchEndEvent;
//import com.thesarvo.xphone.client.mobilewebkit.TouchEndHandler;
//import com.thesarvo.xphone.client.mobilewebkit.TouchPanel;
//import com.thesarvo.xphone.client.mobilewebkit.TouchStartEvent;
//import com.thesarvo.xphone.client.mobilewebkit.TouchStartHandler;
//
//public class TouchScrollPanel2 extends TouchPanel
//{
//	static
//	{
////		/TouchScrollResources.INSTANCE.style().ensureInjected();
//	}
//	
//	TouchPanel innerPanel;
//	JavaScriptObject touchScroll;
//	
//	public TouchScrollPanel2()
//	{
//		addStyleName("touchScrollOuter");
//		
//		innerPanel = new TouchPanel();
//		innerPanel.addStyleName("touchScroller");
//		
//		touchScroll = setupTouchScroll(innerPanel.getElement());
//		
//		innerPanel.addTouchStartHandler(new TouchStartHandler()
//		{
//			@Override
//			public void onTouchStart(TouchStartEvent event)
//			{
//				callHandleEvent(touchScroll, event.getNativeEvent());	
//			}
//		});
//		innerPanel.addTouchEndHandler(new TouchEndHandler()
//		{
//			@Override
//			public void onTouchEnd(TouchEndEvent touchEndEvent)
//			{
//				callHandleEvent(touchScroll, touchEndEvent.getNativeEvent());
//			}
//		});
//	}
//	
//	
//	
//
//	
//	public static native JavaScriptObject setupTouchScroll(com.google.gwt.dom.client.Element element) /*-{
//		var options = {elastic: true};
//		var scroller = new $wnd.TouchScroll(element, options);
//		return scroller;
//	}-*/;
//
//
//	protected static native void callHandleEvent(JavaScriptObject touchScroll, Object event) /*-{
//		touchScroll.handleEvent(event);
//	}-*/;
//
//
//	/**
//	 * @return the innerPanel
//	 */
//	public TouchPanel getInnerPanel()
//	{
//		return innerPanel;
//	}
//
//}
