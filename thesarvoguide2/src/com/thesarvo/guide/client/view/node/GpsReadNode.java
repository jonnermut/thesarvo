package com.thesarvo.guide.client.view.node;

import static com.thesarvo.guide.client.util.StringUtil.isEmpty;
import static com.thesarvo.guide.client.util.StringUtil.isNotEmpty;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.cell.client.Cell;
import com.google.gwt.cell.client.EditTextCell;
import com.google.gwt.cell.client.TextCell;
import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.Style.TextAlign;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.Column;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.view.client.ListDataProvider;
import com.google.gwt.view.client.SelectionChangeEvent;
import com.google.gwt.view.client.SingleSelectionModel;
import com.google.gwt.xml.client.Element;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.geo.CoordinateConversion;
import com.thesarvo.guide.client.geo.CoordinateConversion.UTM;
import com.thesarvo.guide.client.geo.GeoUtil;
import com.thesarvo.guide.client.model.MapDrawingObject;
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class GpsReadNode extends ReadNode implements GPSConstants
{

	private static final double LN2 = Math.log(2);

	// @UiField
	// PagingScrollTable<Point> table;

	// @UiField
	// Anchor googleMapsAnchor;

	@UiField
	Anchor googleEarthAnchor;

	@UiField
	Button mobileButton;

	@UiField
	MapPanel mapPanel;

	// @UiField
	// FlexTable gpsTable;

	@UiField(provided = true)
	CellTable<MapDrawingObject> cellTable;

	@UiField
	Button mapButton2;

	@UiField
	DivElement linksDiv;

	ListDataProvider<MapDrawingObject> dataProvider = new ListDataProvider<MapDrawingObject>();

	interface MyUiBinder extends UiBinder<Widget, GpsReadNode>
	{
	}

	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	// private String kmlUrl;

	// NativeMap nativeMap;

	private List<Element> nodes;
	private List<MapDrawingObject> mapDrawingObjects;

	private static List<XmlSimpleModel> data;

	public GpsReadNode()
	{

	}

	@Override
	public void init()
	{

		cellTable = setupTable(getModel(), dataProvider);
		initTableCols(cellTable, false, null);

		final SingleSelectionModel<MapDrawingObject> selectionModel = new SingleSelectionModel<MapDrawingObject>(null);
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

		// TODO - this has to be an absolute URL to work with good maps, get rid
		// of hard codedness
		String kmlUrl = "http://www.thesarvo.com/confluence/plugins/servlet/ts.kml?pageId=" + Controller.get().getGuideId();

		googleEarthAnchor.setHref("../../plugins/servlet/ts.kml?pageId=" + Controller.get().getGuideId());

		mapButton2.setVisible(false);

		boolean mobileApp = Controller.get().isMobileApp();
		if (mobileApp)
		{
			googleEarthAnchor.setVisible(false);
			mobileButton.setVisible(true);
			mapPanel.setVisible(false);
			linksDiv.getStyle().setTextAlign(TextAlign.RIGHT);
		}
		else
		{

			mapPanel.setKmlUrl(kmlUrl);
			// mapPanel.setPoints(nodes);
			setupMapDrawingObjects();
			mapPanel.init(mapDrawingObjects);
		}

	}

	@UiHandler("mobileButton")
	public void onMobileOpenClick(ClickEvent event)
	{
		String xml = getModel().getXml().toString();
		Controller.get().sendCommandToApp("map", xml);
	}

	private void setupMapDrawingObjects()
	{
		List<Element> els = XPath.getElementChildren(getModel().getXml());
		mapDrawingObjects = new ArrayList<MapDrawingObject>(els.size());
		for (Element el : els)
		{
			mapDrawingObjects.add(new MapDrawingObject(el));
		}
	}

	@Override
	public void setWidgetValuesFromModel()
	{

		super.setWidgetValuesFromModel();
		//updateDataProvider(model, dataProvider);
		nodes = XPath.getElementChildren(getModel().getXml());

		if (mapPanel != null)
		{
			setupMapDrawingObjects();

			mapPanel.setDrawingObjects(mapDrawingObjects);
			mapPanel.updateAllPoints();
			

		}
		
		dataProvider.setList(mapDrawingObjects);
		dataProvider.refresh();
	}

	public static CellTable<MapDrawingObject> setupTable(XmlSimpleModel model, ListDataProvider<MapDrawingObject> dataProvider)
	{
		CellTable<MapDrawingObject> cellTable = new CellTable<MapDrawingObject>();
		//updateDataProvider(model, dataProvider);

		cellTable.setWidth("100%", true);
		dataProvider.addDataDisplay(cellTable);
		return cellTable;
	}

	public static void updateDataProvider(XmlSimpleModel model, ListDataProvider<MapDrawingObject> dataProvider)
	{
		/*
		data = model.getList("point");

		normalizeData(data);

		dataProvider.setList(data);
		dataProvider.refresh();
		
		
		dataProvider.setList(mapDrawingObjects);
		dataProvider.refresh();
		*/
		
	}

	public static void normalizeData(List<XmlSimpleModel> data)
	{
		for (XmlSimpleModel xsm : data)
		{
			// TODO - move this to the model object
			if (xsm.getXml().getNodeName().equals("point"))
			{

				String east = xsm.get(EASTING);
				String north = xsm.get(NORTHING);
				String zone = xsm.get(ZONE);
				String lat = xsm.get(LATITUDE);
				String lon = xsm.get(LONGITUDE);

				if (isNotEmpty(east) && isNotEmpty(north))
				{
					if (isEmpty(zone))
					{
						zone = "55G"; // tassie zone
						xsm.put(ZONE, zone);
					}

					if (isEmpty(lat) || isEmpty(lon))
					{
						// calculate the lat/lon

						try
						{
							CoordinateConversion cc = new CoordinateConversion();

							double[] latlon = GeoUtil.getLatLong(east, north, zone);
							if (latlon != null)
							{
								xsm.put(LATITUDE, GeoUtil.formatLatLong(latlon[0]));
								xsm.put(LONGITUDE, GeoUtil.formatLatLong(latlon[1]));
							}
						}
						catch (Exception e)
						{

						}
					}

				}
				else
				{
					// UTM is (partially) empty - calculate it
					if (isNotEmpty(lat) && isNotEmpty(lon))
					{
						UTM utm = GeoUtil.getUTMFromLatLon(lat, lon);
						if (utm != null)
						{
							xsm.put(EASTING, "" + (int) utm.getEasting());
							xsm.put(NORTHING, "" + (int) utm.getNorthing());
							xsm.put(ZONE, "" + utm.getLongZone() + utm.getLatZone());
						}
					}
				}
			}

		}

	}

	public static void initTableCols(CellTable<MapDrawingObject> cellTable2, boolean editable, MapColumn.UpdateCallback updateCallback)
	{
		Column<MapDrawingObject, String> codeColumn = new MapColumn(editable, CODE, updateCallback);
		cellTable2.setColumnWidth(codeColumn, 10, Unit.PCT);
		cellTable2.addColumn(codeColumn, "Code");

		Column<MapDrawingObject, String> descColumn = new MapColumn(editable, DESCRIPTION, updateCallback);
		cellTable2.setColumnWidth(descColumn, 30, Unit.PCT);
		String desc = "Description";
		if (BrowserUtil.isMobileBrowser())
		{
			cellTable2.setColumnWidth(descColumn, 20, Unit.PCT);
			desc = "Desc";
		}

		cellTable2.addColumn(descColumn, desc);

		if (!BrowserUtil.isMobileBrowser())
		{

			Column<MapDrawingObject, String> zoneColumn = new MapColumn(editable, ZONE, updateCallback);
			cellTable2.setColumnWidth(zoneColumn, 5, Unit.PCT);
			cellTable2.addColumn(zoneColumn, "UTM Zone");

			Column<MapDrawingObject, String> eastingColumn = new MapColumn(editable, EASTING, updateCallback);
			cellTable2.setColumnWidth(eastingColumn, 10, Unit.PCT);
			cellTable2.addColumn(eastingColumn, "UTM Easting");

			Column<MapDrawingObject, String> northingColumn = new MapColumn(editable, NORTHING, updateCallback);
			cellTable2.setColumnWidth(northingColumn, 10, Unit.PCT);
			cellTable2.addColumn(northingColumn, "UTM Northing");

			Column<MapDrawingObject, String> heightColumn = new MapColumn(editable, HEIGHT, updateCallback);
			cellTable2.setColumnWidth(heightColumn, 6, Unit.PCT);
			cellTable2.addColumn(heightColumn, "Height");
		}

		Column<MapDrawingObject, String> latColumn = new MapColumn(editable, LATITUDE, updateCallback);
		cellTable2.setColumnWidth(latColumn, 10, Unit.PCT);
		cellTable2.addColumn(latColumn, "Lat");

		Column<MapDrawingObject, String> longColumn = new MapColumn(editable, LONGITUDE, updateCallback);
		cellTable2.setColumnWidth(longColumn, 10, Unit.PCT);
		cellTable2.addColumn(longColumn, "Long");

		cellTable2.setPageSize(1000);
	}

	static Cell<String> newStringCell(boolean editable)
	{
		return editable ? new EditTextCell() : new TextCell();
	}

	// static Cell<String> newNumberCell(boolean editable)
	// {
	// return editable ? new Edit : new TextCell();
	// }

	/*
	 * public class MapButtonClickHandler implements ClickHandler {
	 * 
	 * @Override public void onClick(ClickEvent event) {
	 * NativeMapView.setPoints(nodes);
	 * 
	 * // todo Controller.get().getEventBus().fireEvent(new
	 * ViewTransitionEvent(new ViewTransition("map", null, false, "Map"))); }
	 * 
	 * }
	 */

}
