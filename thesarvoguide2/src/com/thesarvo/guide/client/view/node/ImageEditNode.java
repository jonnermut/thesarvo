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
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.MultiSelectionModel;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class ImageEditNode extends EditNode
{
	interface MyUiBinder extends UiBinder<Widget, ImageEditNode> {}
	
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);
	
	@UiField BoundListBox climbsListBox;
	@UiField ImageReadNode img;
	@UiField CheckBox legendCheckBox;
	@UiField TableSectionElement legendEditPanel;
	@UiField TextBox legendExtraPage;
	@UiField TextBox legendFooter;
	@UiField TextBox legendx;
	@UiField TextBox legendy;
	@UiField CheckBox legendInsertExtraBefore;
	@UiField TextBox legendTitle;
	@UiField CheckBox noPrint;
	@UiField ListBox srcListBox;
	@UiField Anchor uploadAnchor;
	@UiField ListBox widthListBox;
	
	//@UiField(provided=true) 
	//CellList<String> climbsCellList;
	
	XmlSimpleModel previewModel;
	
	public ImageEditNode()
	{
	}
	
	@Override
	public void init()
	{
		
		/*
		TextCell textCell = new TextCell();
		climbsCellList = new CellList<String>(textCell);
	    final MultiSelectionModel<String> selectionModel = new MultiSelectionModel<String>();
	    climbsCellList.setSelectionModel(selectionModel);
//	    selectionModel.addSelectionChangeHandler(new SelectionChangeEvent.Handler() {
//	      public void onSelectionChange(SelectionChangeEvent event) {
//	        String selected = selectionModel.getSelectedObject();
//	        if (selected != null) {
//	          Window.alert("You selected: " + selected);
//	        }
//	      }
//	    });
	    List<String> DAYS = Arrays.asList("Sunday", "Monday",
	    	      "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
	    climbsCellList.setRowData(0, DAYS);
		
		*/
		
		initWidget(uiBinder.createAndBindUi(this));	
		
		boundWidgets = new Widget[] {
				legendCheckBox, legendx, legendy, legendExtraPage,legendFooter,legendInsertExtraBefore,legendTitle,noPrint,srcListBox, widthListBox
		};
		
		previewModel = new XmlSimpleModel( getModel().getNode().cloneNode(true) );
		
		img.setModel(previewModel);
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
		populateClimbs();
		

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
						
						// FIXME - reimplement
						//getBinder().updateModel(srcListBox);
					}
					
					//Window.alert("srcListBox.getSelectedIndex()=" + srcListBox.getSelectedIndex());
					
					updateAllWidgets();
					
				}
			} );
		
//		for (String i:images)
//			srcListBox.addItem(i);

		uploadAnchor.setHref("../../pages/viewpageattachments.action?pageId=" + Controller.get().getGuideId() + "#attachFile");
		
		
		// TODO: allow chained binders without this crap
		/*
		 * FIXME - cant remember what this is for
		 *
		getBinder().addWidgetChangeHandler(new WidgetChangeHandler()
		{
			@Override
			public void onWidgetChange(Widget widget, GwtEvent<?> sourceEvent)
			{
				img.updateAllWidgets();
			}		
		});
		*/
	}
	
	@Override
	public void setWidgetValuesFromModel() 
	{
		
		super.setWidgetValuesFromModel();
		
		List<String> legends = XPath.selectNodesText(getModel().getNode(), "legend");
		climbsListBox.setSelectedValues(legends);
	}
	
	@Override
	public void setModelValuesFromWidgets() 
	{
		super.setModelValuesFromWidgets();
		
		setModelLegends(getModel());
		
		
		
	}

	private void setModelLegends(XmlSimpleModel model) 
	{
		List<String> vals = WidgetUtil.getSelectedMultipleValue(climbsListBox);
		
		XPath.removeNodes(model.getNode(), "legend");
		for (String val : vals)
		{
			Element el = model.getNode().getOwnerDocument().createElement("legend");
			XPath.setText(el, val);
			model.getNode().appendChild(el);
		}
	}
	
	@UiHandler({"widthListBox","srcListBox","climbsListBox" ,"legendExtraPage","legendFooter","legendTitle", "legendx", "legendy"})	
	public void onChange(ChangeEvent event)
	{
		updatePreview();
	}
	
	@UiHandler({"legendCheckBox","legendInsertExtraBefore"})	
	public void onCheckboxClick(ClickEvent event)
	{
		updatePreview();
	}
	
	public void updatePreview()
	{
		setModelValuesFromWidgets(boundWidgets, previewModel);
		setModelLegends(previewModel);
		img.updateAllWidgets();
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

	private void populateClimbs()
	{
		climbsListBox.clear();
		
 
		 
		Controller.get().populateClimbs((BoundListBox) climbsListBox, 
				 
				legendExtraPage.getValue(),
				legendInsertExtraBefore.getValue() );
		
		
		
	}
	
	private void showLegendEdit(Boolean value)
	{
		WidgetUtil.setVisible(legendEditPanel,value );
		
		
		if (value)
		{
			//legendClimbsPanel.clear();
			
		}
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
}
