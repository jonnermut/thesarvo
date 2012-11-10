package com.thesarvo.xphone.client.event;

import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.event.shared.HandlerManager;
import com.thesarvo.xphone.client.util.Logger;

public class EventBusImpl extends HandlerManager implements EventBus
{
	

	public EventBusImpl()
	{
		super(null);
	}

	@Override
	public void fireEvent(GwtEvent<?> event)
	{
		try
		{
			com.thesarvo.xphone.client.util.Logger.debug("Firing event:" + formatClass(event.getClass()) );
			super.fireEvent(event);
			com.thesarvo.xphone.client.util.Logger.debug("Finished firing event:" + formatClass(event.getClass()));
		}
		catch (RuntimeException e)
		{
			Logger.error("Exception thrown firing event:" + formatClass(event.getClass()), e);
			throw e;
		}
	}
	
	String formatClass(Class clazz)
	{
		//return StringUtil.getLastSegment(clazz.getName(),".");
		return clazz.getName();
	}
}
