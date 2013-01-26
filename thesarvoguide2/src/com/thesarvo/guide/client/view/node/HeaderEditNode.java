package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;


public class HeaderEditNode extends EditNode
{
	@UiField TextBox name;
	@UiField TextBox walk;
	@UiField TextBox sun;
	@UiField TextBox rock;
	@UiField TextArea acknowledgement;
	@UiField TextArea intro;
	@UiField TextArea history;
	@UiField TextArea access;
	@UiField TextArea camping;
	@UiField CheckBox autonumber;
	
	interface MyUiBinder extends UiBinder<Widget, HeaderEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public HeaderEditNode()
	{		
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	
				 
		boundWidgets = new Widget[] {
				name, walk,sun,rock,acknowledgement,intro,history,access,camping, autonumber
		};
		
		super.init();
	}
	
	

}
