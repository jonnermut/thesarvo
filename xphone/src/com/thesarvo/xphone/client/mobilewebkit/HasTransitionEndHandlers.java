package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.shared.HandlerRegistration;

public interface HasTransitionEndHandlers
{
	HandlerRegistration addTransitionEndHandler(TransitionEndHandler handler);

}
