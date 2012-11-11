package com.thesarvo.guide.client.view.node;

import com.google.gwt.user.client.ui.Label;
import com.thesarvo.guide.client.util.StringEscapeUtils;


public class MultlineLabel extends Label
{
	@Override
	public void setText(String text)
	{
		
		getElement().setInnerHTML( getConvertedText(text));
	}
	
	public static String getConvertedText(String text)
	{
		if (text==null)
			return null;
		
		String ret = text;
		ret = ret.replaceAll("<br/>","\n");
		ret = StringEscapeUtils.escapeHtml(ret);
		ret = ret.replaceAll("\n","<br/>");
		return ret;
	}
}
