package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiFactory;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.xml.XmlSimpleModel;


public class ClimbEditNode extends EditNode
{
	@UiField ListBox starsListBox;
	
	@UiField SpanElement lengthSpan;
	
	@UiField TextBox extraTextBox;
	@UiField ListBox extraListBox;
	
	@UiField BoundTextBox number;
	@UiField BoundTextBox name;
	@UiField BoundTextBox length;
	@UiField BoundTextBox grade;
	@UiField BoundTextArea text;
	@UiField BoundTextBox fa;
	
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

		boundWidgets = new Widget[] {
				starsListBox, extraTextBox,extraListBox,number,name,length,grade,text,fa
		};
		
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
	
	@Override
	public void updateAllWidgets() 
	{
		
		super.updateAllWidgets();
		
		/*
		   			<g:BoundListBox bindValue='@stars' ui:field='starsListBox' ></s:BoundListBox>
  			Num: <s:BoundTextBox bindValue='@number' styleName='{r.s.smallText}' />
  			
  			Name: <s:BoundTextBox bindValue='@name' styleName='{r.s.medText}' /> 
  			
  			<span ui:field='lengthSpan' >
  			Length: <s:BoundTextBox bindValue='@length' styleName='{r.s.smallText}' />
  			</span>
  			
  			Grade: <s:BoundTextBox bindValue='@grade' styleName='{r.s.smallText}' />
  			Extra: 
  			<s:BoundTextBox ui:field='extraTextBox' bindValue='@extra' styleName='{r.s.smallText}' />
  			<s:BoundListBox ui:field='extraListBox' bindValue='@extra' />
  			
  		</div>
  		<s:BoundTextArea bindValue="." styleName='{r.s.textArea}' />  		
    	<div class='{r.s.climbfa}'>
  			FA: <s:BoundTextBox bindValue='@fa' styleName='{r.s.faTextBox}' />
		 */
	}
	

}
