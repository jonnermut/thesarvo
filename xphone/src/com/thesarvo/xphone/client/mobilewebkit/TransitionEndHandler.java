package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.shared.EventHandler;

public interface TransitionEndHandler extends EventHandler
{

	void onTransitionEnd(TransitionEndEvent event);
}