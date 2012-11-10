package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.Widget;


public class TextEditNode extends EditNode
{
	@UiField
	ListBox classListBox;
	
	interface MyUiBinder extends UiBinder<Widget, TextEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public TextEditNode()
	{		
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	
		
		classListBox.addItem("text");
		classListBox.addItem("heading1");
		classListBox.addItem("heading2");
		classListBox.addItem("heading3");
		classListBox.addItem("indentedHeader");
		classListBox.addItem("intro");
		classListBox.addItem("Editor");
		classListBox.addItem("Discussion");
		classListBox.addItem("DiscussionNoIndents");
		classListBox.addItem("noPrint");
		 
		super.init();
	}
	
	

}
