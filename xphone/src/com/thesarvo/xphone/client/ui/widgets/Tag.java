package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.ui.ComplexPanel;
import com.google.gwt.user.client.ui.HasHTML;
import com.google.gwt.user.client.ui.HasText;
import com.google.gwt.user.client.ui.Widget;

public class Tag extends ComplexPanel implements HasText, HasHTML
{
	public Tag(String tagname)
	{
		setElement(DOM.createElement(tagname));
	}
	
	public Tag(String tagname, String styleClass)
	{
		this(tagname);
		this.setStylePrimaryName(styleClass);
	}

	public Tag()
	{
	}
	
	public void setTag(String tag)
	{
		setElement(DOM.createElement(tag));
	}

	public void add(Widget w)
	{
		super.add(w, getElement());
	}

	public void insert(Widget w, int beforeIndex)
	{
		super.insert(w, getElement(), beforeIndex, true);
	}

	public String getText()
	{
		return DOM.getInnerText(getElement());
	}

	public void setText(String text)
	{
		DOM.setInnerText(getElement(), (text == null) ? "" : text);
	}

	@Override
	public String getHTML()
	{
		return DOM.getInnerHTML(getElement());
	}

	@Override
	public void setHTML(String html)
	{
		DOM.setInnerHTML(getElement(), (html == null) ? "" : html);
		
	}
	
	
}
