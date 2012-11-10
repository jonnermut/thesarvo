package com.thesarvo.xphone.client.mobilewebkit;



public class TouchStartEvent extends TouchEvent<TouchStartHandler>
{

	private static final Type<TouchStartHandler> TYPE = new Type<TouchStartHandler>(
			"touchstart", new TouchStartEvent());

	public static Type<TouchStartHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<TouchStartHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(TouchStartHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchStartEvent.dispatch()");
		handler.onTouchStart(this);
	}
}
