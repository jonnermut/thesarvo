package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.shared.HandlerRegistration;

public interface HasTouchHandlers
{
	HandlerRegistration addTouchStartHandler(TouchStartHandler handler);
	HandlerRegistration addTouchEndHandler(TouchEndHandler handler);
	HandlerRegistration addTouchMoveHandler(TouchMoveHandler handler);
	HandlerRegistration addTouchCancelHandler(TouchCancelHandler handler);
}
