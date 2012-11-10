package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.google.gwt.event.logical.shared.ValueChangeHandler;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.HasValue;
import com.thesarvo.xphone.client.model.simplebind.HasBindValue;

public class BoundButton extends Button implements HasValue<Object>, HasBindValue
{
	
	Object value;
	String bindValue;
	
	@Override
	public Object getValue()
	{
		
		return value;
	}

	@Override
	public void setValue(Object value)
	{
		this.value = value;
		
	}

	@Override
	public void setValue(Object value, boolean fireEvents)
	{
		this.value = value;
		
		// TODO - hook up properly
	}

	@Override
	public HandlerRegistration addValueChangeHandler(
			ValueChangeHandler<Object> handler)
	{
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String getBindValue()
	{
		return bindValue;
	}

	@Override
	public void setBindValue(String bind)
	{
		bindValue = bind;
		
	}

}
