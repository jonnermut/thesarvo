package com.thesarvo.xphone.client.mobilewebkit;



public class TouchEndEvent extends TouchEvent<TouchEndHandler>
{

	private static final Type<TouchEndHandler> TYPE = new Type<TouchEndHandler>(
			"touchend", new TouchEndEvent());

	public static Type<TouchEndHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<TouchEndHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(TouchEndHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchEndEvent.dispatch()");
		handler.onTouchEnd(this);
	}
}
