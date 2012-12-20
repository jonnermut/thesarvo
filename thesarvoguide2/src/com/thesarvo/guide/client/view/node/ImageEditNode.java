package com.thesarvo.guide.client.view.node;

import java.util.Arrays;
import java.util.List;

import com.google.gwt.cell.client.TextCell;
import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.TableSectionElement;
import com.google.gwt.event.dom.client.ChangeEvent;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.cellview.client.CellList;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.MultiSelectionModel;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.ImageNode;
import com.thesarvo.guide.client.phototopo.PhotoTopo;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class ImageEditNode extends EditNode
{
	
	@UiField FlowPanel flowPanel;
	
	interface MyUiBinder extends UiBinder<Widget, ImageEditNode> {}
	
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);
	
	
	
	public ImageEditNode()
	{
	}
	
	@Override
	public void init()
	{
		
		initWidget(uiBinder.createAndBindUi(this));	
		
		super.init();
		
	}

	@Override
	public void setEditing(boolean editing)
	{
		
		super.setEditing(editing);
		
		flowPanel.clear();
		
		if (editing)
		{
			// TODO
			//uploadAnchor.setHref("../../pages/viewpageattachments.action?pageId=" + Controller.get().getGuideId() + "#attachFile");
			
			ImageNode imageNode = new ImageNode(getModel());

//			Controller.get().populateClimbs((BoundListBox) climbsListBox, 
//					 
//					null,
//					false );
//			
			
			PhotoTopo pt = new PhotoTopo(imageNode, 600, 400);
			
			flowPanel.add(pt);
			
			pt.getOptions().editable = true;
			pt.init();
		}
	}
	
	@Override
	public void setWidgetValuesFromModel() 
	{
		
		super.setWidgetValuesFromModel();
		
//		List<String> legends = XPath.selectNodesText(getModel().getNode(), "legend");
//		climbsListBox.setSelectedValues(legends);
	}
	
	@Override
	public void setModelValuesFromWidgets() 
	{
		super.setModelValuesFromWidgets();
		
		setModelLegends(getModel());
		
		
		
	}

	private void setModelLegends(XmlSimpleModel model) 
	{
		/*
		List<String> vals = WidgetUtil.getSelectedMultipleValue(climbsListBox);
		
		XPath.removeNodes(model.getNode(), "legend");
		for (String val : vals)
		{
			Element el = model.getNode().getOwnerDocument().createElement("legend");
			XPath.setText(el, val);
			model.getNode().appendChild(el);
		}
		*/
	}
	

	
//	public void updatePreview()
//	{
//		setModelValuesFromWidgets(boundWidgets, previewModel);
//		setModelLegends(previewModel);
//		img.updateAllWidgets();
//	}

//	@UiHandler("legendCheckBox")
//	public void onLegendClick(ClickEvent event)
//	{
//		Boolean value = legendCheckBox.getValue();	
//		showLegendEdit(value);
//	}
	
//	@UiHandler("legendExtraPage")
//	public void onLegendExtraPageChange(ValueChangeEvent<String> event)
//	{
//		populateClimbs();
//	}
//	
//	@UiHandler("legendInsertExtraBefore")
//	public void onlegendInsertExtraBeforeChange(ValueChangeEvent<Boolean> event)
//	{
//		populateClimbs();
//	}

	private void populateClimbs()
	{
		/*
		climbsListBox.clear();
		
 
		 
		Controller.get().populateClimbs((BoundListBox) climbsListBox, 
				 
				null,
				false );
		
		
		*/
	}
	
//	private void showLegendEdit(Boolean value)
//	{
//		WidgetUtil.setVisible(legendEditPanel,value );
//		
//		
//		if (value)
//		{
//			//legendClimbsPanel.clear();
//			
//		}
//	}

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
		
		//img.updateAllWidgets();
		
		//onLegendClick(null);
	}
}
