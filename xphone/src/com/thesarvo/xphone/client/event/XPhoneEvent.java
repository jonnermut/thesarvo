package com.thesarvo.xphone.client.event;

import com.google.gwt.event.shared.GwtEvent;

public class XPhoneEvent extends GwtEvent<XPhoneEventHandler>
{
	/**
	 * 
	 */ 
	private static final long serialVersionUID = 1L;
	Object subject;

	public XPhoneEvent(Object subject)
	{
		super();
		
		//super.setSource(source);
		this.subject = subject;
	}

	public Object getSubject()
	{
		return subject;
	}

	@Override
	protected void dispatch(XPhoneEventHandler handler)
	{
		handler.onXPhoneEvent(this);
		
	}

	@Override
	public com.google.gwt.event.shared.GwtEvent.Type<XPhoneEventHandler> getAssociatedType()
	{
		return TYPE;
	}
	
    /**
     * Handler type.
     */
    public static Type<XPhoneEventHandler> TYPE = new Type<XPhoneEventHandler>();


}
