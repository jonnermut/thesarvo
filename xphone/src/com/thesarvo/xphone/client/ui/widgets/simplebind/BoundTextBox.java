package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.google.gwt.user.client.ui.TextBox;
import com.thesarvo.xphone.client.model.simplebind.HasBindValue;

public class BoundTextBox extends TextBox implements HasBindValue
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
	
	@Override
	public void setValue(String value)
	{
		String val = value==null ? null : value.replaceAll("<br/>","\n");
		
		
		super.setValue(val);
	}
}
