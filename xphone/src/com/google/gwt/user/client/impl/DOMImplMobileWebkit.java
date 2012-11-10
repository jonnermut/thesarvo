package com.google.gwt.user.client.impl;



import com.google.gwt.user.client.Element;

public class DOMImplMobileWebkit extends DOMImplSafari
{
	@Override
	public int eventGetTypeInt(String eventType)
	{
		//com.thesarvo.xphone.client.util.Logger.debug("DOMImplMobileWebkit.eventGetTypeInt(" + eventType);
		
		Object ret = null;
		
		try
		{
			ret = super.eventGetTypeInt(eventType);
		}
		catch(Throwable t)
		{
			// do nothing
		}
		
		if (ret!=null && ret instanceof Integer && ((Integer)ret >=0) )
		{
			//com.thesarvo.xphone.client.util.Logger.debug("DOMImplMobileWebkit.eventGetTypeInt(" + eventType + ") returning:" + ret);
			return (Integer) ret;
		}
		else
		{
			//com.thesarvo.xphone.client.util.Logger.debug("DOMImplMobileWebkit.eventGetTypeInt(" + eventType);
			//com.thesarvo.xphone.client.util.Logger.debug("event type not found, trying extra events");
			ret = eventGetTypeIntImpl(eventType);
			if (ret!=null && ret instanceof Integer)
			{
				//com.thesarvo.xphone.client.util.Logger.debug("DOMImplMobileWebkit.eventGetTypeInt(" + eventType + ") returning:" + ret);
				return (Integer) ret;
			}
		}
		
		return -1;
	}
	
	  public native int eventGetTypeIntImpl(String eventType) /*-{
	    switch (eventType) {
	   	
	   	case "touchstart": return 0x100000;
	    case "touchmove": return 0x200000;
	    case "touchcancel": return 0x400000;
	    case "touchend": return 0x800000;
	    case "webkittransitionend": return 0x1000000;
	    case "webkitTransitionEnd": return 0x1000000;
	    case "webkitanimationend": return  0x2000000;
	    case "webkitAnimationEnd": return  0x2000000;

	    }
	  }-*/; 
	
//	protected native int eventGetTypeIntImpl(String eventType) /*-{
//	    switch (eventType) {
//	    case "touchstart": return 0x100000;
//	    case "touchmove": return 0x200000;
//	    case "touchcancel": return 0x400000;
//	    case "touchend": return 0x800000;
//	    case "webkittransitionend": return 0x1000000;
//		}		
//  	}-*/;

	  
	  protected native void sinkEventsImpl(Element elem, int bits) /*-{
	    var chMask = (elem.__eventBits || 0) ^ bits;
	    elem.__eventBits = bits;
	    if (!chMask) return;
	   
	    if (chMask & 0x00001) elem.onclick       = (bits & 0x00001) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00002) elem.ondblclick    = (bits & 0x00002) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00004) elem.onmousedown   = (bits & 0x00004) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00008) elem.onmouseup     = (bits & 0x00008) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00010) elem.onmouseover   = (bits & 0x00010) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00020) elem.onmouseout    = (bits & 0x00020) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00040) elem.onmousemove   = (bits & 0x00040) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00080) elem.onkeydown     = (bits & 0x00080) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00100) elem.onkeypress    = (bits & 0x00100) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00200) elem.onkeyup       = (bits & 0x00200) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00400) elem.onchange      = (bits & 0x00400) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x00800) elem.onfocus       = (bits & 0x00800) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x01000) elem.onblur        = (bits & 0x01000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x02000) elem.onlosecapture = (bits & 0x02000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x04000) elem.onscroll      = (bits & 0x04000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x08000) elem.onload        = (bits & 0x08000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x10000) elem.onerror       = (bits & 0x10000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x20000) elem.onmousewheel  = (bits & 0x20000) ? 
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x40000) elem.oncontextmenu = (bits & 0x40000) ? 
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x80000) elem.onpaste       = (bits & 0x80000) ? 
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;


	    if (chMask & 0x100000) elem.ontouchstart       = (bits & 0x100000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x200000) elem.ontouchmove       = (bits & 0x200000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x400000) elem.ontouchcancel       = (bits & 0x400000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    if (chMask & 0x800000) elem.ontouchend       = (bits & 0x800000) ?
	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
	    
	    //if (chMask & 0x1000000) elem.onwebkittransitionend       = (bits & 0x1000000) ?
	    //    @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
		// TODO: above doesnt seem to work, so use addEventListener
		if ((chMask & 0x1000000 ) && (bits & 0x1000000))
			elem.addEventListener('webkitTransitionEnd', @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent);
		if ((chMask & 0x2000000 ) && (bits & 0x2000000))
			elem.addEventListener('webkitAnimationEnd', @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent);
			

	  }-*/;

	  
	  
//	@Override
//	protected void sinkEventsImpl(Element elem, int bits)
//	{
//		super.sinkEventsImpl(elem, bits);
//		
//		sinkEventsImplWebkit(elem, bits);
//	}
//	
//	  protected native void sinkEventsImplWebkit(Element elem, int bits) /*-{
//	    var chMask = (elem.__eventBits || 0) ^ bits;
//	    elem.__eventBits = bits;
//	    if (!chMask) return;
//	   
//	    if (chMask & 0x100000) elem.ontouchstart       = (bits & 0x100000) ?
//	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
//	    if (chMask & 0x200000) elem.ontouchmove       = (bits & 0x200000) ?
//	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
//	    if (chMask & 0x400000) elem.ontouchcancel       = (bits & 0x400000) ?
//	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
//	    if (chMask & 0x800000) elem.ontouchend       = (bits & 0x800000) ?
//	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
//	    if (chMask & 0x1000000) elem.webkittransitionend       = (bits & 0x1000000) ?
//	        @com.google.gwt.user.client.impl.DOMImplStandard::dispatchEvent : null;
//	    
//  	  }-*/;
	  
}

