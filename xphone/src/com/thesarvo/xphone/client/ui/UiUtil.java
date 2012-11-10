package com.thesarvo.xphone.client.ui;

import com.google.gwt.user.client.ui.Widget;

public abstract class UiUtil
{
	public static void setVisible(Widget w, boolean visible)
	{
		// TODO: explain why we are not just setting w.setVisible ?
		
		w.setVisible(visible);
		
//		if (visible)
//		{
//			w.addStyleName("visible");
//			w.removeStyleName("notvisible");
//		}
//		else
//		{
//			w.removeStyleName("visible");
//			w.addStyleName("notvisible");
//		}
	}
}
