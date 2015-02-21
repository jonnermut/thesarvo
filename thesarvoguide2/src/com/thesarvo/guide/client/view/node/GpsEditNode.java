package com.thesarvo.guide.client.view.node;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.cell.client.ActionCell;
import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.maps.client.base.LatLng;
import com.google.gwt.maps.client.mvc.MVCArray;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.IdentityColumn;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.DialogBox;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.ListDataProvider;
import com.google.gwt.view.client.SelectionChangeEvent;
import com.google.gwt.view.client.SingleSelectionModel;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.thesarvo.guide.client.model.MapDrawingObject;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlService;

public class GpsEditNode extends EditNode implements MapPanel.MapEditedCallback, GPSConstants
{
	// @UiField
	// FlexTable gpsTable;

	@UiField
	Button addButton;
	
	@UiField
	Button importGpx;

	@UiField
	MapPanel mapPanel;
	
	@UiField(provided = true)
	CellTable<MapDrawingObject> cellTable;
	
	
	
	/*
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
	*/

	List<Button> buttonsWithHandler = new ArrayList<Button>();

	ListDataProvider<MapDrawingObject> dataProvider = new ListDataProvider<MapDrawingObject>();

	private List<MapDrawingObject> mapDrawingObjects;
	
	boolean mapInited = false;
	
	MapDrawingObject editElement = null;
	

	//Node tempNode;
	///Node realNode;
	
	interface MyUiBinder extends UiBinder<Widget, GpsEditNode>
	{
	}

	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	private SingleSelectionModel<MapDrawingObject> selectionModel;

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
		
		MapColumn.UpdateCallback uc = new MapColumn.UpdateCallback()
		{

			@Override
			public void onUpdate(MapColumn boundColumn, MapDrawingObject model, String value)
			{
				if (boundColumn.getBinding().equals(NORTHING)
						|| boundColumn.getBinding().equals(EASTING)
						|| boundColumn.getBinding().equals(ZONE))
				{
					model.setLatLngFromUTM();
					//onUTMValueChange(null);
					
					/* FIXME
					if (editElement != null)
					{
						editElement.setZone(zone.getText());
						editElement.setEasting(easting.getText());
						editElement.setNorthing(northing.getText());
						
						editElement.setLatLngFromUTM();
						
						mapPanel.updateDrawingObject(editElement);
						
						setWidgetValuesFromEditElement(editElement);
					}
					*/
				}
				else if (boundColumn.getBinding().equals(LATITUDE)
						|| boundColumn.getBinding().equals(LONGITUDE) )
				{
					model.setUTMFromLatLng();
				}
				
				updateAllWidgets();	
						
				
			}
		};
		
		GpsReadNode.initTableCols(cellTable, true, uc);

		IdentityColumn<MapDrawingObject> removeColumn = new IdentityColumn<MapDrawingObject>(
				new ActionCell<MapDrawingObject>("Remove",
						new ActionCell.Delegate<MapDrawingObject>()
						{
							@Override
							public void execute(MapDrawingObject mdo)
							{
								// Window.alert("You clicked " +
								// model.getNode());
								if (Window.confirm("Are you sure you want to remove this?\n You wont be able to undo"))
								{
									
									com.google.gwt.xml.client.Node node = mdo.getXml();
									node.getParentNode().removeChild(node);
									mdo.removeFromMap();
									mapDrawingObjects.remove(mdo);
									updateAllWidgets();
								}
							}
						}));

		cellTable.setColumnWidth(removeColumn, 10, Unit.PCT);
		cellTable.addColumn(removeColumn, "");
		
		selectionModel = new SingleSelectionModel<MapDrawingObject>(null);
		cellTable.setSelectionModel(selectionModel);
		selectionModel.addSelectionChangeHandler(new SelectionChangeEvent.Handler()
		{
			public void onSelectionChange(SelectionChangeEvent event)
			{
				MapDrawingObject mdo = selectionModel.getSelectedObject();
				mapPanel.selectPoint(mdo);
			}
		});
		
		initWidget(uiBinder.createAndBindUi(this));
		

		super.init();
		
		//cellTable.setVisible(false);
		//addButton.setVisible(false);

		
		addButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				//Element point = getModel().createElement("point", "");
				
				final MapDrawingObject point = createDrawingObject("point");
				point.setDescription("Point");
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
		//GpsReadNode.updateDataProvider(getModel(), dataProvider);
		setWidgetValuesFromModel();
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
		
		dataProvider.setList(mapDrawingObjects);
		dataProvider.refresh();
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
		
		//setWidgetValuesFromEditElement(element);
		
		selectionModel.setSelected(element, true);
		dataProvider.refresh();
		
		
	}

	/*
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
	*/

	/*
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
			
			setWidgetValuesFromEditElement(editElement);
		}
	}
	
	@UiHandler({"latitude", "longitude"})
	void onLatLonValueChange(ValueChangeEvent<String> event)
	{
		if (editElement != null)
		{
			editElement.setLatitude(latitude.getText());
			editElement.setLongitude(longitude.getText());
			
			editElement.setUTMFromLatLng();
			
			mapPanel.updateDrawingObject(editElement);
			
			setWidgetValuesFromEditElement(editElement);
		}
	}
	*/
	
	String importGpx(String xml) throws Exception
	{
		String msg = "";
		Document doc = XmlService.parseXml(xml);
		
		Node gpxNode = doc.getChildNodes().item(0);
		
		for (Node wpt : XPath.selectNodes(gpxNode, "wpt"))
		{
			String lat = XPath.getAttr(wpt, "lat");
			String lon = XPath.getAttr(wpt, "lon");
			String name = XPath.selectSingleNodesText(wpt, "name");
			
			msg += "  Imported waypoint: " + lat + "," + lon + " : " + name + "\n";
			
			MapDrawingObject mdo = createDrawingObject("point");
			mdo.setLatitude(lat);
			mdo.setLongitude(lon);
			mdo.setDescription(name);
			mdo.setUTMFromLatLng();
		}
		
		for (Node trk : XPath.selectNodes(gpxNode, "trk"))
		{
			
			String name = XPath.selectSingleNodesText(trk, "name");
			
			MVCArray<LatLng> points = MVCArray.newInstance();
			
			for (Node trkpt : XPath.selectNodes(trk, "trkseg/trkpt"))
			{
				String lat = XPath.getAttr(trkpt, "lat");
				String lon = XPath.getAttr(trkpt, "lon");
				
				LatLng ll = LatLng.newInstance(Double.parseDouble(lat), Double.parseDouble(lon));
				points.push(ll);
			}
			
			msg += "  Imported track: " + name + "\n";
			
			MapDrawingObject mdo = createDrawingObject("polyline");
			mdo.setPath(points);
			mdo.setDescription(name);

		}
		
		
		return msg;
	}
	
	@UiHandler("importGpx")
	void onImportClick(ClickEvent event)
	{
		final DialogBox db = new DialogBox();
		db.setText("Paste GPX into box below");
		
		VerticalPanel vp = new VerticalPanel();
		
		final TextArea ta = new TextArea();
		ta.setWidth("700px");
		ta.setHeight("400px");
		vp.add(ta);
		
		Button ok = new Button("OK");
		ok.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				try
				{
					String msg = importGpx(ta.getValue());
					
					db.hide();
					
					updateAllWidgets();
					
					Window.alert("Import Succeeded: \n" + msg);
				}
				catch (Exception e)
				{
					Window.alert("Error importing GPX: \n" + e.getLocalizedMessage());
				}
			}
		});
		
		Button cancel = new Button("Cancel");
		cancel.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				db.hide();
				
			}
		});
		
		vp.add(ok);
		vp.add(cancel);
		
		db.setWidget(vp);
		db.center();
		db.show();
	}
}
