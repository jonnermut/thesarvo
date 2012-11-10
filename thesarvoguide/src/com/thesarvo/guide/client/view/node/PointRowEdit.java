//package com.thesarvo.guide.client.view.node;
//
//import com.google.gwt.core.client.GWT;
//import com.google.gwt.event.dom.client.ClickEvent;
//import com.google.gwt.uibinder.client.UiBinder;
//import com.google.gwt.uibinder.client.UiHandler;
//import com.google.gwt.user.client.Window;
//import com.google.gwt.user.client.ui.Widget;
//import com.thesarvo.guide.client.controller.Controller;
//import com.thesarvo.xphone.client.model.simplebind.HasRow;
//import com.thesarvo.xphone.client.ui.widgets.HasWidgetsComposite;
//
//public class PointRowEdit extends HasWidgetsComposite implements HasRow
//{
//	Integer row = null;
//	
//	interface MyUiBinder extends UiBinder<Widget, PointRowEdit> {}
//	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);
//	
//	
//	public PointRowEdit()
//	{
//		initWidget( uiBinder.createAndBindUi(this) );
//	}
//	
//	@UiHandler("removeButton")
//	void onRemoveClick(ClickEvent e)
//	{
//		if ( Window.confirm("Are you sure you want to remove this? You wont be able to undo") )
//			Controller.get().removeGpsRow(getRow());
//	}
//
//	/* (non-Javadoc)
//	 * @see com.thesarvo.guide.client.view.node.HasRow#getRow()
//	 */
//	public Integer getRow()
//	{
//		return row;
//	}
//
//	/* (non-Javadoc)
//	 * @see com.thesarvo.guide.client.view.node.HasRow#setRow(java.lang.Integer)
//	 */
//	public void setRow(Integer row)
//	{
//		this.row = row;
//	}
//}
