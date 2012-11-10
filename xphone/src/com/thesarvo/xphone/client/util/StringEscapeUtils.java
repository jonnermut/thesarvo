package com.thesarvo.xphone.client.util;

import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;

public abstract class StringEscapeUtils
{
	private final static Element div=DOM.createDiv();

	@SuppressWarnings("unused")
	public static String escapeHtml(String maybeHtml)
	{
		synchronized (div)
		{

			
			DOM.setInnerText(div, maybeHtml);
			return DOM.getInnerHTML(div);
		}
	}
}
