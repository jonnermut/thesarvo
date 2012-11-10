package com.thesarvo.guide.client.view.node;

import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.view.res.Resources;

public class TransparentDiv extends FlowPanel
{
	Element inner;

	public TransparentDiv()
	{
		super();

		// TODO: make more generic
		setStylePrimaryName(Resources.INSTANCE.s().transparentDiv());

		inner = DOM.createDiv();
		inner.getStyle().setPosition(Position.RELATIVE);
		getElement().appendChild(inner);
	}

	@Override
	public void add(Widget w)
	{
		add(w, inner);
	}

	public void insert(Widget w, int beforeIndex)
	{
		insert(w, inner, beforeIndex, true);
	}

	public void setText(String string)
	{
		inner.setInnerText(string);
		
	}

}
