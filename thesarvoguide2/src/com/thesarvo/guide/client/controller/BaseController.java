package com.thesarvo.guide.client.controller;

import com.google.gwt.user.client.ui.Widget;
import com.google.web.bindery.event.shared.EventBus;

public class BaseController 
{
	EventBus eventBus;

	public BaseController(EventBus eventBus) 
	{
		this.eventBus = eventBus;
	}
	
	public Widget getCurrentView()
	{
		// fixme
		return null;
	}

}
