package com.thesarvo.xphone.client.mobilewebkit;



public class TouchMoveEvent extends TouchEvent<TouchMoveHandler>
{

	private static final Type<TouchMoveHandler> TYPE = new Type<TouchMoveHandler>(
			"touchmove", new TouchMoveEvent());

	public static Type<TouchMoveHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<TouchMoveHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(TouchMoveHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchMoveEvent.dispatch()");
		handler.onTouchMove(this);
	}
}
