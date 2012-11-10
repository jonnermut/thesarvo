package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.shared.EventHandler;

public interface TouchEndHandler extends EventHandler
{
	void onTouchEnd(TouchEndEvent touchEndEvent);
}