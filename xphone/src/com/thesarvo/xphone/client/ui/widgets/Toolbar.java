package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.user.client.ui.FlowPanel;

public class Toolbar extends FlowPanel
{
	Tag titleTag = new Tag("h1");
	
	public Toolbar()
	{
		setStylePrimaryName("toolbar");
		add(titleTag);
	}

	/**
	 * @return the titleTag
	 */
	public Tag getTitleTag()
	{
		return titleTag;
	}

	/**
	 * @param titleTag the titleTag to set
	 */
	public void setTitleTag(Tag titleTag)
	{
		this.titleTag = titleTag;
	}
	
	public String getTitle()
	{
		return titleTag.getText();
	}
	
	public void setTitle(String title)
	{
		titleTag.setText(title);
	}
}
