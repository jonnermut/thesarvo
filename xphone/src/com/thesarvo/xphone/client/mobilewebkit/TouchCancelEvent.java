package com.thesarvo.xphone.client.mobilewebkit;



public class TouchCancelEvent extends TouchEvent<TouchCancelHandler>
{

	private static final Type<TouchCancelHandler> TYPE = new Type<TouchCancelHandler>(
			"touchcancel", new TouchCancelEvent());

	public static Type<TouchCancelHandler> getType()
	{
		return TYPE;
	}

	@Override
	public final Type<TouchCancelHandler> getAssociatedType()
	{
		return TYPE;
	}

	@Override
	protected void dispatch(TouchCancelHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchCancelEvent.dispatch()");
		handler.onTouchCancel(this);
	}
}
