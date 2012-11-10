package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.thesarvo.xphone.client.model.simplebind.HasBindVisible;
import com.thesarvo.xphone.client.ui.widgets.Tag;

public class BoundTag extends Tag implements HasBindVisible
{
	String bindValue;
	String bindVisible;
	
	public BoundTag(String tag)
	{
		super(tag);
	}

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

	/**
	 * @return the bindVisible
	 */
	public String getBindVisible()
	{
		return bindVisible;
	}

	/**
	 * @param bindVisible the bindVisible to set
	 */
	public void setBindVisible(String bindVisible)
	{
		this.bindVisible = bindVisible;
	}
}
