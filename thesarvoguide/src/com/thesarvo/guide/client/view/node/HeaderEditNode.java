package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.user.client.ui.Widget;


public class HeaderEditNode extends EditNode
{

	
	interface MyUiBinder extends UiBinder<Widget, HeaderEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public HeaderEditNode()
	{		
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	
				 
		super.init();
	}
	
	

}
