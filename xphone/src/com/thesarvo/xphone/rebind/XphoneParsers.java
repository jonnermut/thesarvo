package com.thesarvo.xphone.rebind;

import com.google.gwt.uibinder.rebind.UiBinderWriter;

public class XphoneParsers
{

	public static void addXphoneParsers(UiBinderWriter uiBinderWriter)
	{
		uiBinderWriter.addElementParser("com.thesarvo.xphone.client.ui.widgets.simplebind.Repeater", "com.thesarvo.xphone.rebind.RepeaterParser");
		
		uiBinderWriter.addElementParser("com.thesarvo.xphone.client.ui.widgets.simplebind.FlexTable", "com.thesarvo.xphone.rebind.FlexTableParser");
	}

}
