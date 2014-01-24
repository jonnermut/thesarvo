package com.thesarvo.guide.client.view.node;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.Scheduler;
import com.google.gwt.core.client.Scheduler.RepeatingCommand;
import com.google.gwt.maps.client.LoadApi;
import com.google.gwt.maps.client.LoadApi.LoadLibrary;
import com.google.gwt.maps.client.MapImpl;
import com.google.gwt.maps.client.MapOptions;
import com.google.gwt.maps.client.MapTypeId;
import com.google.gwt.maps.client.MapWidget;
import com.google.gwt.maps.client.base.LatLng;
import com.google.gwt.maps.client.base.LatLngBounds;
import com.google.gwt.maps.client.controls.ControlPosition;
import com.google.gwt.maps.client.controls.MapTypeControlOptions;
import com.google.gwt.maps.client.drawinglib.DrawingControlOptions;
import com.google.gwt.maps.client.drawinglib.DrawingManager;
import com.google.gwt.maps.client.drawinglib.DrawingManagerOptions;
import com.google.gwt.maps.client.drawinglib.OverlayType;
import com.google.gwt.maps.client.events.bounds.BoundsChangeMapEvent;
import com.google.gwt.maps.client.events.bounds.BoundsChangeMapHandler;
import com.google.gwt.maps.client.events.center.CenterChangeMapEvent;
import com.google.gwt.maps.client.events.center.CenterChangeMapHandler;
import com.google.gwt.maps.client.events.click.ClickMapEvent;
import com.google.gwt.maps.client.events.click.ClickMapHandler;
import com.google.gwt.maps.client.events.dragend.DragEndMapEvent;
import com.google.gwt.maps.client.events.dragend.DragEndMapHandler;
import com.google.gwt.maps.client.events.insertat.InsertAtMapEvent;
import com.google.gwt.maps.client.events.insertat.InsertAtMapHandler;
import com.google.gwt.maps.client.events.mousemove.MouseMoveMapEvent;
import com.google.gwt.maps.client.events.mousemove.MouseMoveMapHandler;
import com.google.gwt.maps.client.events.overlaycomplete.OverlayCompleteMapEvent;
import com.google.gwt.maps.client.events.overlaycomplete.OverlayCompleteMapHandler;
import com.google.gwt.maps.client.events.radius.RadiusChangeMapEvent;
import com.google.gwt.maps.client.events.radius.RadiusChangeMapHandler;
import com.google.gwt.maps.client.events.removeat.RemoveAtMapEvent;
import com.google.gwt.maps.client.events.removeat.RemoveAtMapHandler;
import com.google.gwt.maps.client.events.setat.SetAtMapEvent;
import com.google.gwt.maps.client.events.setat.SetAtMapHandler;
import com.google.gwt.maps.client.maptypes.Projection;
import com.google.gwt.maps.client.mvc.MVCArray;
import com.google.gwt.maps.client.overlays.Animation;
import com.google.gwt.maps.client.overlays.Circle;
import com.google.gwt.maps.client.overlays.CircleOptions;
import com.google.gwt.maps.client.overlays.InfoWindow;
import com.google.gwt.maps.client.overlays.InfoWindowOptions;
import com.google.gwt.maps.client.overlays.Marker;
import com.google.gwt.maps.client.overlays.MarkerOptions;
import com.google.gwt.maps.client.overlays.Polygon;
import com.google.gwt.maps.client.overlays.PolygonOptions;
import com.google.gwt.maps.client.overlays.Polyline;
import com.google.gwt.maps.client.overlays.PolylineOptions;
import com.google.gwt.maps.client.overlays.Rectangle;
import com.google.gwt.maps.client.overlays.RectangleOptions;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.geo.CoordinateConversion;
import com.thesarvo.guide.client.geo.GeoUtil;
import com.thesarvo.guide.client.model.MapDrawingObject;
import com.thesarvo.guide.client.phototopo.Console;
import com.thesarvo.guide.client.util.Logger;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.xml.XPath;

public class MapPanel extends FlowPanel implements GPSConstants
{

	private static final int DEFAULT_STROKE = 3;

	private static final double DEFAULT_OPACITY = 0.2;

	private static final String WHITE = "#FFFFFF";

	public interface MapEditedCallback
	{
		public void elementEdited(MapDrawingObject element);
		public void elementSelected(MapDrawingObject element);

		public MapDrawingObject createDrawingObject(String elementName);
	}

	List<MapDrawingObject> drawingObjects;

	// Map<Node, LabelOverlay> labelOverlays = new HashMap<Node,
	// LabelOverlay>();
	Map<String, MapDrawingObject> elementIdToMapObject = new HashMap<String, MapDrawingObject>();
	Map<Marker, MarkerInfoWindowClickHandler> clickHandlers = new HashMap<Marker, MarkerInfoWindowClickHandler>();

	MapWidget map;

	String kmlUrl;

	TransparentDiv posDiv;

	Label latLonLabel = new Label();
	Label utmLabel = new Label();

	CoordinateConversion coordinates = new CoordinateConversion();

	Projection projection;

	boolean editable;
	MapEditedCallback delegate;

	private LatLngBounds bounds;

	private DrawingManager drawingManager;
	
	
	InfoWindow infowindow;

	public MapPanel()
	{

	}

	private void loadMapApi()
	{
		boolean sensor = true;

		// load all the libs for use in the maps
		ArrayList<LoadLibrary> loadLibraries = new ArrayList<LoadApi.LoadLibrary>();
		// loadLibraries.add(LoadLibrary.ADSENSE);
		loadLibraries.add(LoadLibrary.DRAWING);
		loadLibraries.add(LoadLibrary.GEOMETRY);
		// loadLibraries.add(LoadLibrary.PANORAMIO);
		// loadLibraries.add(LoadLibrary.PLACES);
		// loadLibraries.add(LoadLibrary.WEATHER);
		// loadLibraries.add(LoadLibrary.VISUALIZATION);

		Runnable onLoad = new Runnable()
		{
			@Override
			public void run()
			{
				setupMapWidget();
			}
		};

		LoadApi.go(onLoad, loadLibraries, sensor);
	}

	/**
	 * @return the points
	 */
	public List<MapDrawingObject> getDrawingObjects()
	{
		return drawingObjects;
	}

	/**
	 * @param points
	 *            the points to set
	 */
	public void setDrawingObjects(List<MapDrawingObject> points)
	{
		this.drawingObjects = points;
	}

	public void init(final List<MapDrawingObject> points)
	{
		this.drawingObjects = points;

		loadMapApi();


	}

	private native static JavaScriptObject getAerialMapType() /*-{
		return $wnd.G_AERIAL_HYBRID_MAP;

	}-*/;

	protected void setupMapWidget()
	{
		if (map != null)
			return;
		
		Console.log("setupMapWidget");
		
		// MapOptions mo = MapOptions.newInstance();

		//LatLng center = LatLng.newInstance(40.74, -73.94);
		
		LatLng center = LatLng.newInstance(-42.130, 146.7);
		bounds = LatLngBounds.newInstance(center, center);
		//bounds.extend(point)
		MapOptions opts = MapOptions.newInstance();
		opts.setZoom(7);
		opts.setCenter(center);
		opts.setMapTypeId(MapTypeId.HYBRID);
		

		MapTypeControlOptions controlOptions = MapTypeControlOptions
				.newInstance();
		controlOptions.setMapTypeIds(MapTypeId.values()); // use all of them
		controlOptions.setPosition(ControlPosition.RIGHT_TOP);

		opts.setMapTypeControlOptions(controlOptions);

		map = new MapWidget(opts);
		
		
		//map.setWidth("100%");
		map.setWidth("800px");
		//map.setHeight(Window.getClientHeight() * 4 / 5 + "px");
		map.setHeight("400px");
		
		this.add(map);

		
		map.addMouseMoveHandler(new MouseMoveHandler());

		posDiv = new TransparentDiv();
		posDiv.add(latLonLabel);
		posDiv.add(utmLabel);

		map.setControls(ControlPosition.RIGHT_BOTTOM, posDiv);

		if (editable)
		{
			
			
			if (this.drawingObjects.size() == 0)
			{
				final MapDrawingObject point = delegate.createDrawingObject("point");
				point.setLatLng(center);
				
			}
			
			setupDrawing();
		}
		
		updateAllPoints();

		String url = kmlUrl;
		
		resizeAfterDelay();

	}

	void resizeAfterDelay()
	{
		Scheduler.get().scheduleFixedDelay(new RepeatingCommand()
		{		
			@Override
			public boolean execute()
			{
				resize();
				return false;
			}
		}, 100);
	}
	
	void resize()
	{
		Console.log("resize()");
		if (map!= null)
		{
			resizeImpl(map.getJso());
			
			if (bounds != null)
				map.fitBounds(bounds);
		}
		
	}

	public final native void resizeImpl(MapImpl map) /*-{
		$wnd.google.maps.event.trigger(map, 'resize');
	}-*/;
	
	public void updateAllPoints()
	{

		
		Console.log("updateAllPoints: " + drawingObjects);

		removeOverlays();
		
		bounds = null;

		if (map!=null && drawingObjects != null && drawingObjects.size() > 0)
		{



			for (MapDrawingObject n : drawingObjects)
			{
				

				LatLng latlng = updateDrawingObject(n);
				
				if (latlng != null)
				{

					if (bounds == null)
						bounds = LatLngBounds.newInstance(latlng, latlng);
					else
						bounds.extend(latlng);
				}
			}
			


		}

//		if (bounds == null && map != null)
//		{
//			LatLng sw = LatLng.newInstance(-43.66, 144.613  );
//			LatLng ne = LatLng.newInstance(-39.54, 148.62 );
//			bounds = LatLngBounds.newInstance(sw, ne);
//		}
		
		
		if (bounds != null && map != null)
		{
			map.setCenter(bounds.getCenter());

			map.fitBounds(bounds);
			
			if (map.getZoom() > 15)
				map.setZoom(15);
		}
//		else if (map != null)
//		{
//			LatLng sw = LatLng.newInstance(-43.66, 144.613  );
//			map.setCenter(sw);
//			map.setZoom(12);
//		}
	}

	public LatLng updateDrawingObject(MapDrawingObject n)
	{
		LatLng latlng = null;
		
		String name = n.getType();
		
		if (name.equals("point"))
		{
			latlng = updatePoint(n);
		}
		else if (name.equals("circle"))
		{
			latlng = updateCircle(n);
		}
		else if (name.equals("polyline"))
		{
			latlng = updatePolyline(n);
		}
		else if (name.equals("polygon"))
		{
			latlng = updatePolygon(n);
		}
		else if (name.equals("rectangle"))
		{
			latlng = updateRectangle(n);
		}
		return latlng;
	}

	private LatLng updateRectangle(MapDrawingObject element)
	{
		removeExistingFromMap(element);
		
		try
		{
			
			
			RectangleOptions po = defaultRectangleOptions();
			
			MVCArray<LatLng> path = element.getPath();
			
			if (path.getLength() > 1)
			{
				LatLngBounds bounds = LatLngBounds.newInstance(path.get(0), path.get(1));
				po.setBounds(bounds);
				Rectangle rectangle = Rectangle.newInstance(po);
				rectangle.setMap(map);
				
				setupEditableRectangle(rectangle, element);
				rememberOverlay(element, rectangle);
				return bounds.getCenter();
			}
			

		}
		catch (Exception e)
		{
			
		}
		return null;
	}

	private void removeExistingFromMap(MapDrawingObject element)
	{
		MapDrawingObject existing = getExistingObject(element);
		if (existing != null)
			existing.removeFromMap();
	}

	private LatLng updatePolygon(MapDrawingObject element)
	{
		removeExistingFromMap(element);
		
		try
		{
			
			
			PolygonOptions po = defaultPolygonOptions();
			
			MVCArray<LatLng> path = element.getPath();
			
			
			po.setPaths(path);
			Polygon polygon = Polygon.newInstance(po);
			polygon.setMap(map);
			
			setupEditablePolygon(polygon, element);
			rememberOverlay(element, polygon);

			if (path.getLength() > 0)
				return path.get(0);			

		}
		catch (Exception e)
		{
			
		}
		return null;
	}

	private LatLng updateCircle(MapDrawingObject element)
	{
		removeExistingFromMap(element);
		
		try
		{
			String radius = element.getRadius();
			
			LatLng lcenter = element.getLatLng();
			double dradius = Double.parseDouble(radius);
			
			CircleOptions options = defaultCircleOptions();
			
			if (lcenter !=null && radius != null)
			{
				options.setCenter(lcenter);
				
				options.setRadius(dradius);
				Circle circle = Circle.newInstance(options);
				circle.setMap(map);
				
				setupEditableCircle(circle, element);
				rememberOverlay(element, circle);
				return lcenter;
			}
			

		}
		catch (Exception e)
		{
			
		}
		return null;
	}
	
	
	private LatLng updatePolyline(MapDrawingObject element)
	{
		removeExistingFromMap(element);
		
		try
		{
			
			
			PolylineOptions po = defaultPolylineOptions();
			
			MVCArray<LatLng> path = element.getPath();
			
			po.setPath(path);
			Polyline polyline = Polyline.newInstance(po);
			polyline.setMap(map);
			
			setupEditablePolyline(polyline, element);
			rememberOverlay(element, polyline);

			if (path.getLength() > 0)
				return path.get(0);			

		}
		catch (Exception e)
		{
			
		}
		return null;
	}





	private LatLng updatePoint(final MapDrawingObject point)
	{
		Logger.debug("point:" + point);
		
		

		LatLng latlng = point.getLatLng();
		final String text = point.getTextForPoint();

		if (latlng != null)
		{
			// Logger.debug("Adding overlay for point " + ll[0] + "," + ll[1]);

			/*
			 * FIXME
			 * 
			 * LabelOverlay overlay = labelOverlays.get(point); if (overlay ==
			 * null) { overlay = new LabelOverlay(latlng, text);
			 * 
			 * } else {
			 * 
			 * map.removeOverlay(overlay); overlay.setPos(latlng);
			 * overlay.setText(text); } map.addOverlay(overlay);
			 * labelOverlays.put(point, overlay);
			 */
			
			removeExistingFromMap(point);
			final Marker marker = createMarker(latlng, text, point);	

//			MapDrawingObject existing = getExistingObject(point);
//			if (existing != null && existing==point)
//			{
//				Marker existingMarker = (Marker)existing.getOverlay();
//				existingMarker.setPosition(latlng);
//				existingMarker.setMap((MapWidget)null);
//				existingMarker.setMap(map);
//				// TODO - change text
//			}
//			else
//			{
//				final Marker marker = createMarker(latlng, text, point);		
//			}
		}
		return latlng;
	}

	private Marker createMarker(LatLng latlng, final String text, MapDrawingObject point)
	{
		MarkerOptions mo = MarkerOptions.newInstance();
		mo.setClickable(true);
		mo.setTitle(text);
		mo.setPosition(latlng);
		mo.setMap(map);
		final Marker marker = Marker.newInstance(mo);
		
		
		// map.addOverlay(marker);


		MarkerInfoWindowClickHandler handler = new MarkerInfoWindowClickHandler(marker, point);
		clickHandlers.put(marker, handler);
		marker.addClickHandler(handler);
		
		
		rememberOverlay(point, marker);
		
		setupEditableMarker(point, marker);
		
		return marker;
	}

	private void setupEditableMarker(final MapDrawingObject point, final Marker marker)
	{
		if (editable)
		{
			marker.setDraggable(true);
			marker.addDragEndHandler(new DragEndMapHandler()
			{
				
				@Override
				public void onEvent(DragEndMapEvent event)
				{
					setMarkerAttributes(point, marker);
					
				}


			});
		}
	}

	private void setMarkerAttributes(final MapDrawingObject point, final Marker marker)
	{
		LatLng pos = marker.getPosition();
		point.setLatLng(pos);
		
		if (delegate != null)
			delegate.elementEdited(point);
	}
	


	private void removeOverlays()
	{
		/*
		 * FIXME for (LabelOverlay lo : labelOverlays.values())
		 * map.removeOverlay(lo);
		 * 
		 * labelOverlays.clear();
		 * 
		 * for (Marker m : markers.values()) map.removeOverlay(m);
		 */

		//elementToMapObject.clear();
		

	}

	/**
	 * @return the kmlUrl
	 */
	public String getKmlUrl()
	{
		return kmlUrl;
	}

	/**
	 * @param kmlUrl
	 *            the kmlUrl to set
	 */
	public void setKmlUrl(String kmlUrl)
	{
		this.kmlUrl = kmlUrl;
	}

	private final class MarkerInfoWindowClickHandler implements ClickMapHandler
	{
		
		private Marker marker;
		private MapDrawingObject element;

		private MarkerInfoWindowClickHandler(Marker marker, MapDrawingObject element)
		{
			this.marker = marker;
			this.element = element;
		}

		@Override
		public void onEvent(ClickMapEvent event)
		{
			if (!editable)
			{
				if (infowindow == null)
				{
					InfoWindowOptions options = InfoWindowOptions.newInstance();
					options.setContent(element.getTextForPoint());
	
					infowindow = InfoWindow.newInstance(options);
				}
				else
				{
					infowindow.close();
					infowindow.setContent(element.getTextForPoint());
				}
				infowindow.open(map, marker);
			}
			if (delegate != null)
			{
				delegate.elementSelected(element);
			}
			

		}
	}

	private final class MouseMoveHandler implements MouseMoveMapHandler
	{

		@Override
		public void onEvent(MouseMoveMapEvent event)
		{
			final LatLng ll = event.getMouseEvent().getLatLng();

			DeferredCommand.addCommand(new Command()
			{

				@Override
				public void execute()
				{
					double[] lla = new double[] { ll.getLatitude(),
							ll.getLongitude() };
					String latlong = GeoUtil.formatLatLong(lla);
					latLonLabel.setText(latlong);

					String utm = coordinates.latLon2UTM(ll.getLatitude(),
							ll.getLongitude()).toString();
					utmLabel.setText(utm);
				}
			});

		}
	}

	/*
	 * public class ListTileLayer extends TileLayer { CopyrightCollection cc;
	 * 
	 * 
	 * public ListTileLayer(CopyrightCollection cc) { super(cc , 9, 19);
	 * cc.addCopyright(new Copyright(0, LatLngBounds.newInstance(
	 * LatLng.newInstance(-50, 130), LatLng.newInstance(-30, 150)), 8,
	 * "� Copyright State of Tasmania")); }
	 * 
	 * @Override public double getOpacity() { return 1; }
	 * 
	 * @Override public String getTileURL(Point tile, int zoomLevel) { //
	 * http://
	 * www.thelist.tas.gov.au/listmap/listmapgetmap?minx=513137.1966476798
	 * &miny=5249479.271861119
	 * &maxx=523105.2508787326&maxy=5252414.272&iwidth=1457
	 * &iheight=429&layers=17
	 * &disabledlayers=&imageno=5&grid=true&rasteralpha=10&
	 * vectoralpha=0&wmsalpha=10
	 * 
	 * double[] rect = GoogleTileUtils.getTileRect(tile.getX(), tile.getY(),
	 * zoomLevel);
	 * 
	 * UTM u1 = coordinates.latLon2UTM(rect[0], rect[1] ); UTM u2 =
	 * coordinates.latLon2UTM(rect[2], rect[3] );
	 * 
	 * String ret =
	 * "http://www.thelist.tas.gov.au/listmap/listmapgetmap?iwidth=256&iheight=256&layers=17&disabledlayers=&imageno=5&grid=false&scale=false&rasteralpha=10&vectoralpha=0&wmsalpha=10&minx="
	 * ; ret += u1.getEasting(); ret += "&maxy="; ret += u1.getNorthing(); ret
	 * += "&maxx="; ret += u2.getEasting(); ret += "&miny="; ret +=
	 * u2.getNorthing();
	 * 
	 * return ret; }
	 * 
	 * @Override public boolean isPng() { return false; }
	 * 
	 * }
	 */

	public void selectPoint(Node node)
	{

		Object obj = getExistingObject((MapDrawingObject) node);

		if (obj != null && obj instanceof Marker)
		{
			MarkerInfoWindowClickHandler mch = clickHandlers.get(obj);
			if (mch != null) mch.onEvent(null); 
		}
	 
	}

	private void setupDrawing()
	{
		Console.log("setupMapWidget");

		DrawingControlOptions drawingControlOptions = DrawingControlOptions
				.newInstance();
		drawingControlOptions.setPosition(ControlPosition.TOP_CENTER);
		drawingControlOptions.setDrawingModes(OverlayType.values());
		

		DrawingManagerOptions options = DrawingManagerOptions.newInstance();
		
		options.setMap(map);
		// options.setDrawingMode(OverlayType.CIRCLE);

		CircleOptions circleOptions = defaultCircleOptions();
		options.setCircleOptions(circleOptions);

		PolygonOptions polygonOptions = defaultPolygonOptions();
		options.setPolygonOptions(polygonOptions);

		PolylineOptions polylineOptions = defaultPolylineOptions();
		options.setPolylineOptions(polylineOptions);

		RectangleOptions rectangleOptions = defaultRectangleOptions();
		options.setRectangleOptions(rectangleOptions);

		options.setDrawingControlOptions(drawingControlOptions);

		drawingManager = DrawingManager.newInstance(options);
		
		drawingManager.addOverlayCompleteHandler(new OverlayCompleteMapHandler()
		{
			@Override
			public void onEvent(OverlayCompleteMapEvent event)
			{
				drawingManager.setDrawingMode(null);
				OverlayType ot = event.getOverlayType();
				GWT.log("marker completed OverlayType=" + ot.toString());

				
				
				if (ot == OverlayType.CIRCLE)
				{
					final Circle circle = event.getCircle();
					GWT.log("radius=" + circle.getRadius());
					GWT.log("center=" + circle.getBounds().getCenter());
					
					if (delegate != null)
					{
						final MapDrawingObject element = delegate.createDrawingObject("circle");
						setCircleAttributes(circle, element);
						
						setupEditableCircle(circle, element);
						rememberOverlay(element, circle);
					}
				}

				if (ot == OverlayType.MARKER)
				{
					Marker marker = event.getMarker();
					GWT.log("position=" + marker.getPosition());
					GWT.log("center=" + marker.getPosition());
					
					if (delegate != null)
					{
						final MapDrawingObject point = delegate.createDrawingObject("point");
						setMarkerAttributes(point, marker);
						setupEditableMarker(point, marker);
						rememberOverlay(point, marker);
					}
					
					
				}

				if (ot == OverlayType.POLYGON)
				{
					Polygon polygon = event.getPolygon();
					if (delegate != null)
					{
						final MapDrawingObject element = delegate.createDrawingObject("polygon");
						setPolygonAttributes(polygon, element);
						
						setupEditablePolygon(polygon, element);
						rememberOverlay(element, polygon);
					}
				}

				if (ot == OverlayType.POLYLINE)
				{
					Polyline polyline = event.getPolyline();
					if (delegate != null)
					{
						final MapDrawingObject element = delegate.createDrawingObject("polyline");
						setPolylineAttributes(polyline, element);
						
						setupEditablePolyline(polyline, element);
						rememberOverlay(element, polyline);
					}
				}

				if (ot == OverlayType.RECTANGLE)
				{
					Rectangle rectangle = event.getRectangle();
					if (delegate != null)
					{
						final MapDrawingObject element = delegate.createDrawingObject("rectangle");
						setRectangleAttributes(rectangle, element);
						
						setupEditableRectangle(rectangle, element);
						rememberOverlay(element, rectangle);
					}
				}

				GWT.log("marker completed OverlayType=" + ot.toString());
			}


		});

	}
	
	private void setupEditablePolygon(final Polygon polygon, final MapDrawingObject element)
	{
		if (editable)
		{
			polygon.setEditable(true);
			polygon.getPath().addSetAtHandler(new SetAtMapHandler()
			{				
				@Override
				public void onEvent(SetAtMapEvent event)
				{
					setPolygonAttributes(polygon, element);					
				}
			});
			polygon.getPath().addInsertAtHandler(new InsertAtMapHandler()
			{
				
				@Override
				public void onEvent(InsertAtMapEvent event)
				{
					setPolygonAttributes(polygon, element);				
				}
			});
			polygon.getPath().addRemoveAtHandler(new RemoveAtMapHandler()
			{
				
				@Override
				public void onEvent(RemoveAtMapEvent event)
				{
					setPolygonAttributes(polygon, element);							
				}
			});
		}		
	}
	
	private void setupEditablePolyline(final Polyline polyline,
			final MapDrawingObject element)
	{
		if (editable)
		{
			polyline.setEditable(true);
			polyline.getPath().addSetAtHandler(new SetAtMapHandler()
			{				
				@Override
				public void onEvent(SetAtMapEvent event)
				{
					setPolylineAttributes(polyline, element);					
				}
			});
			polyline.getPath().addInsertAtHandler(new InsertAtMapHandler()
			{
				
				@Override
				public void onEvent(InsertAtMapEvent event)
				{
					setPolylineAttributes(polyline, element);			
				}
			});
			polyline.getPath().addRemoveAtHandler(new RemoveAtMapHandler()
			{
				
				@Override
				public void onEvent(RemoveAtMapEvent event)
				{
					setPolylineAttributes(polyline, element);						
				}
			});
		}
		
	}

	private void setPolylineAttributes(Polyline polyline,
			MapDrawingObject element)
	{
		
		MVCArray<LatLng> points = polyline.getPath();
		element.setPath( points);
		if (delegate != null)
			delegate.elementEdited(element);
	}
	
	private void setPolygonAttributes(Polygon polygon,
			MapDrawingObject element)
	{
		
		MVCArray<LatLng> points = polygon.getPath();
		element.setPath( points);
		if (delegate != null)
			delegate.elementEdited(element);
	}



	private void setupEditableCircle(final Circle circle,
			final MapDrawingObject element)
	{
		if (editable)
		{
			circle.setEditable(true);
			circle.addCenterChangeHandler(new CenterChangeMapHandler()
			{						
				@Override
				public void onEvent(CenterChangeMapEvent event)
				{
					setCircleAttributes(circle, element);		
				}
			});
			circle.addRadiusChangeHandler(new RadiusChangeMapHandler()
			{
				@Override
				public void onEvent(RadiusChangeMapEvent event)
				{
					setCircleAttributes(circle, element);
				}					
			});
			circle.addClickHandler(new ClickMapHandler()
			{
				
				@Override
				public void onEvent(ClickMapEvent event)
				{
					if (delegate!=null)
					{
						delegate.elementSelected(element);
					}
					
				}
			});
		}
	}

	private void setCircleAttributes(Circle circle, MapDrawingObject el)
	{
		el.setRadius("" + circle.getRadius());
		el.setLatLng(circle.getBounds().getCenter());
		
		
		if (delegate != null)
			delegate.elementEdited(el);
	}

	
	private void setupEditableRectangle(final Rectangle rectangle,final MapDrawingObject element)
	{
		if (editable)
		{
			rectangle.setEditable(true);
			rectangle.addBoundsChangeHandler(new BoundsChangeMapHandler()
			{
				
				@Override
				public void onEvent(BoundsChangeMapEvent event)
				{
					setRectangleAttributes(rectangle, element);
					
				}
			});
		}
		
	}

	private void setRectangleAttributes(Rectangle rectangle,
			MapDrawingObject element)
	{
		MVCArray<LatLng> path = MVCArray.newInstance();
		path.push( rectangle.getBounds().getSouthWest());
		path.push( rectangle.getBounds().getNorthEast());
		
		element.setPath(path);
		
		if (delegate != null)
			delegate.elementEdited(element);
		
	}
	


	private RectangleOptions defaultRectangleOptions()
	{
		RectangleOptions rectangleOptions = RectangleOptions.newInstance();
		rectangleOptions.setStrokeColor(WHITE);
		rectangleOptions.setFillOpacity(DEFAULT_OPACITY);
		rectangleOptions.setStrokeWeight(DEFAULT_STROKE);
		return rectangleOptions;
	}

	private PolylineOptions defaultPolylineOptions()
	{
		PolylineOptions polylineOptions = PolylineOptions.newInstance();
		polylineOptions.setStrokeColor(WHITE);
		polylineOptions.setStrokeWeight(DEFAULT_STROKE);
		return polylineOptions;
	}

	private PolygonOptions defaultPolygonOptions()
	{
		PolygonOptions polygonOptions = PolygonOptions.newInstance();
		polygonOptions.setStrokeColor(WHITE);
		polygonOptions.setFillOpacity(DEFAULT_OPACITY);
		polygonOptions.setStrokeWeight(DEFAULT_STROKE);
		return polygonOptions;
	}

	private CircleOptions defaultCircleOptions()
	{
		CircleOptions circleOptions = CircleOptions.newInstance();
		circleOptions.setStrokeColor(WHITE);
		circleOptions.setFillOpacity(DEFAULT_OPACITY);
		circleOptions.setStrokeWeight(DEFAULT_STROKE);
		return circleOptions;
	}

	/**
	 * @return the editable
	 */
	public boolean isEditable()
	{
		return editable;
	}

	/**
	 * @param editable
	 *            the editable to set
	 */
	public void setEditable(boolean editable)
	{
		this.editable = editable;
	}

	/**
	 * @return the delegate
	 */
	public MapEditedCallback getDelegate()
	{
		return delegate;
	}

	/**
	 * @param delegate
	 *            the delegate to set
	 */
	public void setDelegate(MapEditedCallback delegate)
	{
		this.delegate = delegate;
	}

	public void addNewPointAndSetToCentre(MapDrawingObject point)
	{
		LatLng centre = map.getCenter();
		Marker marker = createMarker(centre, "", point);
		marker.setAnimation(Animation.DROP);
		setMarkerAttributes(point, marker);
			
	}
	
	MapDrawingObject getExistingObject(MapDrawingObject mdo)
	{
		return getExistingObject(mdo.getPid());
	}
	
	MapDrawingObject getExistingObject(String pid)
	{
		
		MapDrawingObject mdo = elementIdToMapObject.get(pid);
		return mdo;
			
		
	}
	
	void rememberOverlay(MapDrawingObject element, Object obj)
	{
		String pid = element.getPid();
		element.setOverlay(obj);
		elementIdToMapObject.put(pid, element);
	}

}
