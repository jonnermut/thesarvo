package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.History;

public class BackButton extends StyledButton
{
	public BackButton()
	{
		this("Back");
	}

	public BackButton(String text)
	{
		super(text);
		
		addStyleName("back");
		
		this.addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				History.back();
			}
		});
	}
	
	
}
