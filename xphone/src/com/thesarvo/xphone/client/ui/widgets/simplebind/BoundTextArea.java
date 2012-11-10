package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.google.gwt.user.client.ui.TextArea;
import com.thesarvo.xphone.client.model.simplebind.HasBindValue;

public class BoundTextArea extends TextArea implements HasBindValue
{
	String bindValue;

	/**
	 * @return the bindValue
	 */
	public String getBindValue()
	{
		return bindValue;
	}

	/**
	 * @param bindValue the bindValue to set
	 */
	public void setBindValue(String bindValue)
	{
		this.bindValue = bindValue;
	}
	
	
}
