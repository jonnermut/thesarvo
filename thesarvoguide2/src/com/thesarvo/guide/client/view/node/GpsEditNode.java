package com.thesarvo.guide.client.view.node;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.cell.client.ActionCell;
import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.KeyPressEvent;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.IdentityColumn;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.ListDataProvider;
import com.google.gwt.xml.client.Element;
import com.thesarvo.guide.client.model.MapDrawingObject;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class GpsEditNode extends EditNode implements MapPanel.MapEditedCallback, GPSConstants
{
	// @UiField
	// FlexTable gpsTable;

	@UiField
	Button addButton;

	@UiField
	MapPanel mapPanel;
	
	@UiField(provided = true)
	CellTable<XmlSimpleModel> cellTable;
	
	@UiField Label editLabel;
	
	@UiField Label selectMsg;
	@UiField VerticalPanel editPanel;
	@UiField VerticalPanel pointFields;
	@UiField TextBox code;
	@UiField TextArea description;
	
	@UiField TextBox zone;
	@UiField TextBox easting;
	@UiField TextBox northing;
	@UiField TextBox height;
	@UiField TextBox latitude;
	@UiField TextBox longitude;
	

	List<Button> buttonsWithHandler = new ArrayList<Button>();

	ListDataProvider<XmlSimpleModel> dataProvider = new ListDataProvider<XmlSimpleModel>();

	private List<MapDrawingObject> mapDrawingObjects;
	
	boolean mapInited = false;
	
	MapDrawingObject editElement = null;
	

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
									com.google.gwt.xml.client.Node node = getModel().getNode();
									node.getParentNode().removeChild(node);
									updateAllWidgets();
								}
							}
						}));

		cellTable.setColumnWidth(removeColumn, 5, Unit.PCT);
		cellTable.addColumn(removeColumn, "");
		
		

		initWidget(uiBinder.createAndBindUi(this));

		super.init();
		
		cellTable.setVisible(false);
		addButton.setVisible(false);

		
		addButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				//Element point = getModel().createElement("point", "");
				
				final MapDrawingObject point = createDrawingObject("point");
				mapPanel.addNewPointAndSetToCentre(point);
				updateAllWidgets();
				
			}
		});

		

		if (!mapInited)
		{
			mapInited = true;
			mapPanel.setDelegate(GpsEditNode.this);
			mapPanel.setEditable(true);
			mapPanel.init(mapDrawingObjects);
		}
	}
	
	@Override
	public void setVisible(boolean visible)
	{
		
		super.setVisible(visible);
		
		if (visible)
		{
			mapPanel.resizeAfterDelay();
		}
	}

	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();
		
		

		//List<XmlSimpleModel> data = getModel().getList("point");
		//dataProvider.setList(data);
		//cellTable.redraw();
		GpsReadNode.updateDataProvider(getModel(), dataProvider);
	}
	
	@Override
	public void setModelValuesFromWidgets()
	{
		
		super.setModelValuesFromWidgets();
		

	}
	
	@Override
	public void setWidgetValuesFromModel()
	{
		
		super.setWidgetValuesFromModel();
		

		
		setupMapDrawingObjects();

		if (mapPanel != null)
		{
			mapPanel.setDrawingObjects(mapDrawingObjects);
			mapPanel.updateAllPoints();
		}
	}

	private void setupMapDrawingObjects()
	{
		List<Element> els = XPath.getElementChildren(getModel().getXml() );
		mapDrawingObjects = new ArrayList<MapDrawingObject>(els.size());
		for (Element el : els)
		{
			mapDrawingObjects.add(new MapDrawingObject(el));
		}
	}



	@Override
	public void elementEdited(MapDrawingObject element)
	{
		
		elementSelected(element);
		
	}

	@Override
	public MapDrawingObject createDrawingObject(String elementName)
	{
		Element el = getModel().getXml().getOwnerDocument().createElement(elementName);
		getModel().getXml().appendChild(el);
		//ret.setAttribute("pid", "" + GpsReadNode.pointId++);
		MapDrawingObject mdo = new MapDrawingObject(el);
		mapDrawingObjects.add(mdo);
		mdo.getPid();
		
		return mdo;
	}

	@Override
	public void elementSelected(MapDrawingObject element)
	{
		editElement = element;
		
		setWidgetValuesFromEditElement(element);
		
	}

	private void setWidgetValuesFromEditElement(MapDrawingObject element)
	{
		selectMsg.setVisible(false);
		editPanel.setVisible(true);
		
		editLabel.setText("Editing: " + element.getType());
		code.setText(editElement.getCode() );
		description.setText(editElement.getDescription() );
		
		if (element.getType().equals("point"))
		{
			pointFields.setVisible(true);
			zone.setText(editElement.getZone() );
			easting.setText(editElement.getEasting() );
			northing.setText(editElement.getNorthing() );
			height.setText(editElement.getHeight() );
			latitude.setText(editElement.getLatitude() );
			longitude.setText(editElement.getLongitude() );
		}
		else
		{
			pointFields.setVisible(false);
		}
	}
	

	
	@UiHandler({"code", "description"})
	void onCodeValueChange(ValueChangeEvent<String> event)
	{
		if (editElement != null)
		{
			editElement.setCode(code.getText());
			editElement.setDescription(description.getText());
		}
	}
	
	@UiHandler({"code", "description"})
	void onCodeKeyPress(KeyPressEvent event)
	{
		onCodeValueChange(null);
	}

	@UiHandler({"zone", "easting", "northing"})
	void onUTMValueChange(ValueChangeEvent<String> event)
	{
		if (editElement != null)
		{
			editElement.setZone(zone.getText());
			editElement.setEasting(easting.getText());
			editElement.setNorthing(northing.getText());
			
			editElement.setLatLngFromUTM();
			
			mapPanel.updateDrawingObject(editElement);
		}
	}
}
