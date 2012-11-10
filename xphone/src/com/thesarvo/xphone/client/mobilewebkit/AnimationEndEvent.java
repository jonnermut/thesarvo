package com.thesarvo.xphone.client.mobilewebkit;



import com.google.gwt.event.dom.client.DomEvent;

public class AnimationEndEvent extends DomEvent<AnimationEndHandler>
{
	private static final Type<AnimationEndHandler> TYPE = new Type<AnimationEndHandler>(
			"webkitAnimationEnd", new AnimationEndEvent());

	public static Type<AnimationEndHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<AnimationEndHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(AnimationEndHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("AnimationEndEvent.dispatch()");
		handler.onAnimationEnd(this);
	}
}
