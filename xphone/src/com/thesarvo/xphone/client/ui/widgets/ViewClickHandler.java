package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.History;
import com.thesarvo.xphone.client.application.Application;
import com.thesarvo.xphone.client.event.EventBus;
import com.thesarvo.xphone.client.event.ViewTransition;
import com.thesarvo.xphone.client.event.ViewTransitionEvent;

public class ViewClickHandler implements ClickHandler
{
	
	private ViewTransition transition;
	
	//EventBus eventBus = null;
	


	public ViewClickHandler(ViewTransition transition)
	{
		super();
		this.transition = transition;
		
	}

	@Override
	public void onClick(ClickEvent event)
	{
		com.thesarvo.xphone.client.util.Logger.debug("ViewClickHandler.onClick(" + event);
		com.thesarvo.xphone.client.util.Logger.debug("event source=" + event.getSource());
		
		event.preventDefault();
		event.stopPropagation();
		
		//Window.alert("ViewClickHandler.onClick()");
		
		EventBus eventBus = Application.get().getEventBus();
		
		if (eventBus!=null)
			eventBus.fireEvent(new ViewTransitionEvent( transition ) );
		
		History.newItem(transition.getToViewId(), true);
		
//		logger.log("Pushing " + viewId + " to History stack");
		
//		
//		ControllerImpl.get().showView(viewId);
	}
}
