package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.xphone.client.model.simplebind.WidgetChangeHandler;
import com.thesarvo.xphone.client.ui.widgets.WidgetUtil;
import com.thesarvo.xphone.client.ui.widgets.simplebind.BoundListBox;
import com.thesarvo.xphone.client.util.StringUtil;

public class ImageEditNode extends EditNode
{
	@UiField
	ImageReadNode img;
	
	@UiField
	ListBox srcListBox;
	
	@UiField
	ListBox widthListBox;
	
	@UiField
	CheckBox legendCheckBox;
	
	@UiField
	DivElement legendEditPanel;
	
	@UiField
	//ComplexPanel legendClimbsPanel;
	BoundListBox climbsListBox;
	
	@UiField
	CheckBox legendInsertExtraBefore;
	
	@UiField
	Anchor uploadAnchor;
	
	@UiField
	TextBox legendExtraPage;
	
	interface MyUiBinder extends UiBinder<Widget, ImageEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public ImageEditNode()
	{
	}
	
	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	
		
		img.setModel(getModel());
		img.init();
		
		//img.updateAllWidgets();
		
		super.init();
		
		
		widthListBox.addItem("auto","");
		widthListBox.addItem("100");
		widthListBox.addItem("200");
		widthListBox.addItem("300");
		widthListBox.addItem("400");
		widthListBox.addItem("500");
		widthListBox.addItem("600");
		widthListBox.addItem("700");
		widthListBox.addItem("800");
		widthListBox.addItem("900");
		widthListBox.addItem("1000");
		
		Controller.get().populateAttachments(srcListBox);
		
		DeferredCommand.addCommand (
			new Command()
			{
				@Override
				public void execute()
				{
					//Window.alert("srcListBox.getSelectedIndex()=" + srcListBox.getSelectedIndex() + " srcListBox.getItemCount()=" + srcListBox.getItemCount());
					
					String src = StringUtil.string(getModel().get("@src"));
					if (StringUtil.isEmpty(src) && srcListBox.getItemCount() > 0)
					{
						srcListBox.setSelectedIndex(0);
						getBinder().updateModel(srcListBox);
					}
					
					//Window.alert("srcListBox.getSelectedIndex()=" + srcListBox.getSelectedIndex());
					
					updateAllWidgets();
					
				}
			} );
		
//		for (String i:images)
//			srcListBox.addItem(i);

		uploadAnchor.setHref("../../pages/viewpageattachments.action?pageId=" + Controller.get().getGuideId() + "#attachFile");
		
		
		// TODO: allow chained binders without this crap
		getBinder().addWidgetChangeHandler(new WidgetChangeHandler()
		{
			@Override
			public void onWidgetChange(Widget widget, GwtEvent<?> sourceEvent)
			{
				img.updateAllWidgets();
			}		
		});
	}
	

	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();
		
//		String src = StringUtil.string(getModel().get("@src"));
//		String width = StringUtil.string(getModel().get("@width"));
		
//		img.setUrl( Controller.get().getAttachmentUrl(src) );
//		if (width!=null && width.length()>0)
//		{
//			if (!width.endsWith("px"))
//				width += "px";
//			
//			img.setWidth(width);
//		}
		
		img.updateAllWidgets();
		
		onLegendClick(null);
	}
	
	@UiHandler("legendCheckBox")
	public void onLegendClick(ClickEvent event)
	{
		Boolean value = legendCheckBox.getValue();	
		showLegendEdit(value);
	}
	
	@UiHandler("legendExtraPage")
	public void onLegendExtraPageChange(ValueChangeEvent<String> event)
	{
		populateClimbs();
	}

	@UiHandler("legendInsertExtraBefore")
	public void onlegendInsertExtraBeforeChange(ValueChangeEvent<Boolean> event)
	{
		populateClimbs();
	}
	
	private void showLegendEdit(Boolean value)
	{
		WidgetUtil.setVisible(legendEditPanel,value );
		
		
		if (value)
		{
			//legendClimbsPanel.clear();
			populateClimbs();
		}
	}

	private void populateClimbs()
	{
		climbsListBox.clear();
		Controller.get().populateClimbs(climbsListBox, 
				getBinder(), 
				legendExtraPage.getValue(),
				legendInsertExtraBefore.getValue() );
		

		
	}
}
