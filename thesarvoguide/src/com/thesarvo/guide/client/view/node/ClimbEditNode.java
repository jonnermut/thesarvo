package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiFactory;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.xphone.client.model.simplebind.XmlSimpleModel;
import com.thesarvo.xphone.client.ui.widgets.WidgetUtil;
import com.thesarvo.xphone.client.ui.widgets.simplebind.BoundListBox;
import com.thesarvo.xphone.client.ui.widgets.simplebind.BoundTextBox;


public class ClimbEditNode extends EditNode
{
	@UiField
	ListBox starsListBox;
	
	@UiField
	SpanElement lengthSpan;
	
	@UiField
	BoundTextBox extraTextBox;
	
	@UiField
	BoundListBox extraListBox;
	
	String type;
	
	interface MyUiBinder extends UiBinder<Widget, ClimbEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);
	

	public ClimbEditNode()
	{
			
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	

		
		starsListBox.addItem("");
		starsListBox.addItem("*");
		starsListBox.addItem("**");
		starsListBox.addItem("***");
		
		
		type = ((XmlSimpleModel) this.getModel()).getXml().getNodeName();
		
		if (type.equals("climb"))
			extraListBox.setVisible(false);
		else
		{
			WidgetUtil.setVisible(lengthSpan, false);
			extraTextBox.setVisible(false);
						
			extraListBox.addItem("");
			extraListBox.addItem("(SDS)");
			extraListBox.addItem("(Stand)");
			extraListBox.addItem("(Hang)");
			extraListBox.addItem("(Highball)");
			extraListBox.addItem("(Highball, Stand)");
			extraListBox.addItem("(Highball, SDS)");
		}
		
		super.init();

		
	}
	
	@UiFactory
	public ClimbEditNode getThis()
	{
		return this;
	}
	

}
