package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.dom.client.Style.Display;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.NodeWrapper;


public class EditControls extends Composite
{
	@UiField
	SpanElement editButtonsSpan;

	@UiField
	SpanElement editingButtonsSpan;
	
	NodeWrapper nw = null;
		
	interface MyUiBinder extends UiBinder<Widget, EditControls> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public EditControls(NodeWrapper nodeWrapper)
	{	
		initWidget(uiBinder.createAndBindUi(this));
		this.nw = nodeWrapper;
		
	}
	
	public void setEditing(boolean editing)
	{
		editButtonsSpan.getStyle().setDisplay(editing ? Display.NONE : Display.INLINE);
		editingButtonsSpan.getStyle().setDisplay(editing ? Display.INLINE : Display.NONE);
	}
	
	@UiHandler("editButton")
	public void onEdit(ClickEvent event)
	{
		Controller.get().onEdit(nw);
	}
	
	@UiHandler("deleteButton")
	public void onDelete(ClickEvent event)
	{
		if ( Window.confirm("Are you sure you want to remove this? You wont be able to undo") )
			Controller.get().onDelete(nw);
	}
	
	@UiHandler("saveButton")
	public void onSave(ClickEvent event)
	{
		Controller.get().onSave(nw);
	}

	@UiHandler("cancelButton")
	public void onCancel(ClickEvent event)
	{
		Controller.get().onCancel(nw);
	}
}
