package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.thesarvo.xphone.client.util.StringEscapeUtils;

public class BoundMultlineLabel extends BoundLabel
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
