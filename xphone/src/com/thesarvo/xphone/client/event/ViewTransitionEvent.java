package com.thesarvo.xphone.client.event;


public class ViewTransitionEvent extends XPhoneEvent
{

	public ViewTransitionEvent(ViewTransition viewTransition)
	{
		super(viewTransition);
	}

	public ViewTransition getViewTransition()
	{
		return (ViewTransition) getSubject();
	}
	
}
