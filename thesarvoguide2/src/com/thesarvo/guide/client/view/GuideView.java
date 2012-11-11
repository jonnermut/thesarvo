package com.thesarvo.guide.client.view;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.Style.Display;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.HTMLPanel;
import com.google.gwt.user.client.ui.InlineLabel;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.Guide;
import com.thesarvo.guide.client.model.NodeType;
import com.thesarvo.guide.client.view.node.TextReadNode;


public class GuideView extends FlowPanel
{
	@UiField
	FlowPanel guideContainer;
	
	@UiField
	Button editGuideButton;

	@UiField
	VerticalPanel logPanel;
	
	@UiField
	Button upgradeGuideButton;
	
	//PopupPanel savingPopup = new PopupPanel(false);
	
	@UiField
	DivElement savingDiv;
	
	//@UiField
	//Toolbar toolbar;
	
	interface MyUiBinder extends UiBinder<HTMLPanel, GuideView> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	Guide guide = new Guide(this);
	
	FlowPanel capturingPanel = null;
	
	
	public GuideView(String id)
	{
		super();
		
		guide.setGuideId(id);
		//initWidget(uiBinder.createAndBindUi(this));
		this.add(uiBinder.createAndBindUi(this));

		addStyleName("view");
		this.getElement().getStyle().setBackgroundColor("#ffffff");
		
		/*
		if (Controller.get().isMultiPage() && !Controller.get().isUsingNativeNavBar())
		{
			toolbar.setVisible(true);
			//toolbar.setTitle(title);
		}
		*/
		
		showPopup(false);

		//getTouchManager().setAppliesActiveStyle(false);
	}
	
	/*
	public void setTitle(String title)
	{
		toolbar.setTitle(title);
	}
	*/
	
	@UiHandler("editGuideButton")
	public void editClick(ClickEvent click)
	{
		Controller.get().toggleEditMode();
		
		if (editGuideButton.getText().startsWith("Edit"))
			editGuideButton.setText("Stop Editing");
		else
			editGuideButton.setText("Edit This Guide");
		
		
	}

	public void addNode(NodeWrapper nw)
	{
		if (capturingPanel==null 
				|| (nw.getNodeType()==NodeType.text && ((TextReadNode)nw.getReadNode()).isHeading() ) 
				|| nw.getNodeType()==NodeType.header )
			guideContainer.add(nw);
		else
			capturingPanel.add(nw);
		
	}
	
	public void insertNode(NodeWrapper nw, NodeWrapper previousNode)
	{
		int beforeIndex = guideContainer.getWidgetIndex(previousNode);
		beforeIndex++;
		guideContainer.insert(nw, beforeIndex);
		
	}
	

	public void setEditVisible(boolean b)
	{
		editGuideButton.setVisible(b);
		
	}

	public void remove(NodeWrapper nw)
	{
		guideContainer.remove(nw);
	}
	
	public void showPopup(boolean show)
	{
		if (show)
			savingDiv.getStyle().setDisplay(Display.BLOCK);
		else
			savingDiv.getStyle().setDisplay(Display.NONE);
		
		//WidgetUtil.setVisible(savingDiv, show);
	}
	
	public void showAdvanced()
	{
		upgradeGuideButton.setVisible(true);
		logPanel.setVisible(true);
	}
	
	public void addLogLine(String log)
	{
		//logLabel.setText( logLabel.getText() + log + "\n");
		logPanel.add(new InlineLabel(log));
	}
	
	@UiHandler("upgradeGuideButton")
	public void onUpgradeClick(ClickEvent e)
	{
		Controller.get().upgrade();
	}

	/**
	 * @return the guide
	 */
	public Guide getGuide()
	{
		return guide;
	}

	/**
	 * @param guide the guide to set
	 */
	public void setGuide(Guide guide)
	{
		this.guide = guide;
	}

	/**
	 * @return the capturingPanel
	 */
	public FlowPanel getCapturingPanel()
	{
		return capturingPanel;
	}

	/**
	 * @param capturingPanel the capturingPanel to set
	 */
	public void setCapturingPanel(FlowPanel capturingPanel)
	{
		this.capturingPanel = capturingPanel;
	}
	
}

