package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.google.gwt.user.client.ui.Label;
import com.thesarvo.xphone.client.model.simplebind.HasBindValue;

public class BoundLabel extends Label implements HasBindValue
{
	String bind;
	
	@Override
	public String getBindValue()
	{
		return bind;
	}

	@Override
	public void setBindValue(String bind)
	{
		this.bind = bind;
		
	}
	
}
