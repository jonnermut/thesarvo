package com.thesarvo.guide.client.view.node;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.cell.client.ActionCell;
import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.IdentityColumn;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.FlexTable;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.ListDataProvider;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class GpsEditNode extends EditNode
{
	// @UiField
	// FlexTable gpsTable;

	@UiField
	Button addButton;

	@UiField(provided = true)
	CellTable<XmlSimpleModel> cellTable;

	List<Button> buttonsWithHandler = new ArrayList<Button>();

	ListDataProvider<XmlSimpleModel> dataProvider = new ListDataProvider<XmlSimpleModel>();

	//Node tempNode;
	///Node realNode;
	
	interface MyUiBinder extends UiBinder<Widget, GpsEditNode>
	{
	}

	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public GpsEditNode()
	{
	}

	@Override
	public void init()
	{
//		realNode = getModel().getNode();
//		tempNode = realNode.cloneNode(true);
//		getModel().setNode(tempNode);
		
		cellTable = GpsReadNode.setupTable(getModel(), dataProvider);
		GpsReadNode.initTableCols(cellTable, true);

		IdentityColumn<XmlSimpleModel> removeColumn = new IdentityColumn<XmlSimpleModel>(
				new ActionCell<XmlSimpleModel>("Remove",
						new ActionCell.Delegate<XmlSimpleModel>()
						{
							@Override
							public void execute(XmlSimpleModel model)
							{
								// Window.alert("You clicked " +
								// model.getNode());
								if (Window
										.confirm("Are you sure you want to remove this?\n You wont be able to undo"))
								{
									Node node = model.getNode();
									node.getParentNode().removeChild(node);
									updateAllWidgets();
								}
							}
						}));

		cellTable.setColumnWidth(removeColumn, 5, Unit.PCT);
		cellTable.addColumn(removeColumn, "");

		initWidget(uiBinder.createAndBindUi(this));

		super.init();

		addButton.addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				((XmlSimpleModel) getModel()).createNode("point", "");
				updateAllWidgets();

			}
		});

	}

	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();

		//List<XmlSimpleModel> data = getModel().getList("point");
		//dataProvider.setList(data);
		//cellTable.redraw();

	}
	
	@Override
	public void setModelValuesFromWidgets()
	{
		
		super.setModelValuesFromWidgets();
		
		GpsReadNode.updateDataProvider(model, dataProvider);
	}
	
	@Override
	public void setWidgetValuesFromModel()
	{
		
		super.setWidgetValuesFromModel();
		
		GpsReadNode.updateDataProvider(model, dataProvider);
	}

}
