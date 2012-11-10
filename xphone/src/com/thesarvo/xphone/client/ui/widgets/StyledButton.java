package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.user.client.ui.Button;

public class StyledButton extends Button
{
	public StyledButton()
	{
		super();
		
		addStyleName("button");
	}

	public StyledButton(String text)
	{
		super(text);
		
		addStyleName("button");
	}
}
