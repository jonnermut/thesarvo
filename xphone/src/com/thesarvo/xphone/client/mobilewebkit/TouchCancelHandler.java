package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.shared.EventHandler;

public interface TouchCancelHandler extends EventHandler
{

	void onTouchCancel(TouchCancelEvent event);
}