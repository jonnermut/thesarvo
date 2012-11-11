package com.thesarvo.guide.client.view.node;

import com.google.gwt.user.client.ui.TextBox;
import com.thesarvo.guide.client.view.HasBindValue;

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
