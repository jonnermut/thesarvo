package com.thesarvo.guide.client.view.node;

import com.google.gwt.user.client.ui.CheckBox;
import com.thesarvo.guide.client.view.HasBindValue;

public class BoundCheckBox extends CheckBox implements HasBindValue
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
