package com.thesarvo.guide.client.phototopo;

import com.google.gwt.event.shared.GwtEvent;

public class PhotoTopoEvent extends GwtEvent<PhotoTopoEventHandler>
{
	/**
	 * 
	 */ 
	private static final long serialVersionUID = 1L;
	Object subject;

	public PhotoTopoEvent(Object subject)
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
	protected void dispatch(PhotoTopoEventHandler handler)
	{
		handler.onEvent(this);
		
	}

	@Override
	public com.google.gwt.event.shared.GwtEvent.Type<PhotoTopoEventHandler> getAssociatedType()
	{
		return TYPE;
	}
	
    /**
     * Handler type.
     */
    public static Type<PhotoTopoEventHandler> TYPE = new Type<PhotoTopoEventHandler>();


}
