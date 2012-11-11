package com.thesarvo.guide.client.view.res;

import com.google.gwt.user.client.Window;

public class StyleHelper
{
	public static String font()
	{
		if (Window.Navigator.getUserAgent().toLowerCase().contains("webkit"))
			return "helvetica,tahoma,arial";
		else
			return "tahoma,arial,helvetica";
	}
}
