package com.thesarvo.guide.client.view.node;

import com.google.gwt.user.client.ui.Label;
import com.thesarvo.guide.client.view.HasBindValue;

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
