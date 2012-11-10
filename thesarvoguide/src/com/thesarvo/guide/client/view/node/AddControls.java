package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.NodeWrapper;
import com.thesarvo.xphone.client.ui.widgets.WidgetUtil;


public class AddControls extends Composite
{
	
	private static final String SELECT = "<select>";

	@UiField
	ListBox addListBox;
	
	@UiField
	Button addButton;
		
	NodeWrapper nw = null;
		
	interface MyUiBinder extends UiBinder<Widget, AddControls> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public AddControls(NodeWrapper nodeWrapper)
	{	
		initWidget(uiBinder.createAndBindUi(this));
		this.nw = nodeWrapper;
		
		addListBox.addItem(SELECT);
		addListBox.addItem("text");
		addListBox.addItem("climb");
		addListBox.addItem("problem");
		addListBox.addItem("image");
		addListBox.addItem("header block", "header");
		addListBox.addItem("gps");
		
		
	}
	
	
	@UiHandler("addButton")
	public void onAdd(ClickEvent event)
	{
		String type = WidgetUtil.getSelectedSingleValue(addListBox);
		
		if (type!=null && !type.equals(SELECT))
			Controller.get().onAdd(nw, type);
	}
}
