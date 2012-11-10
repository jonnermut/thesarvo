package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.event.dom.client.DomEvent;

public class TransitionEndEvent extends DomEvent<TransitionEndHandler>
{
	private static final Type<TransitionEndHandler> TYPE = new Type<TransitionEndHandler>(
			"webkitTransitionEnd", new TransitionEndEvent());

	public static Type<TransitionEndHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<TransitionEndHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(TransitionEndHandler handler)
	{
		handler.onTransitionEnd(this);
	}
}
