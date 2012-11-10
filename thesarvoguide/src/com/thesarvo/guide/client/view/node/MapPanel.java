package com.thesarvo.guide.client.view.node;

import java.util.List;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.RunAsyncCallback;
import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.i18n.client.NumberFormat;
import com.google.gwt.maps.client.Copyright;
import com.google.gwt.maps.client.CopyrightCollection;
import com.google.gwt.maps.client.MapType;
import com.google.gwt.maps.client.MapWidget;
import com.google.gwt.maps.client.Maps;
import com.google.gwt.maps.client.TileLayer;
import com.google.gwt.maps.client.control.HierarchicalMapTypeControl;
import com.google.gwt.maps.client.control.LargeMapControl3D;
import com.google.gwt.maps.client.control.OverviewMapControl;
import com.google.gwt.maps.client.control.ScaleControl;
import com.google.gwt.maps.client.event.MapMouseMoveHandler;
import com.google.gwt.maps.client.geom.LatLng;
import com.google.gwt.maps.client.geom.LatLngBounds;
import com.google.gwt.maps.client.geom.MercatorProjection;
import com.google.gwt.maps.client.geom.Point;
import com.google.gwt.maps.client.geom.Projection;
import com.google.gwt.maps.client.overlay.GeoXmlLoadCallback;
import com.google.gwt.maps.client.overlay.GeoXmlOverlay;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.shared.CoordinateConversion;
import com.thesarvo.guide.shared.CoordinateConversion.UTM;
import com.thesarvo.xphone.client.geo.GeoUtil;
import com.thesarvo.xphone.client.util.StringUtil;

public class MapPanel extends FlowPanel
{

	

	List<Node> points;
	
	MapWidget map;
	
	String kmlUrl;
	
	TransparentDiv posDiv;
	
	static final NumberFormat LATFORMAT = NumberFormat.getFormat("0.00000");;
	
	Label latLonLabel = new Label();
	Label utmLabel = new Label();
	
	CoordinateConversion coordinates = new CoordinateConversion();
	
	Projection projection;

	/**
	 * @return the points
	 */
	public List<Node> getPoints()
	{
		return points;
	}

	/**
	 * @param points the points to set
	 */
	public void setPoints(List<Node> points)
	{
		this.points = points;
	}
	
	
	public void init(final List<Node> points)
	{
		this.points = points;
		
		GWT.runAsync(new RunAsyncCallback()
		{
			
			@Override
			public void onSuccess()
			{
				Runnable onLoad = new Runnable()
				{
					@Override
					public void run()
					{				
						setupMapWidget();	
					}
				};
				Maps.loadMapsApi("ABQIAAAAKsgDQTt0s-n_qBW3HFYtDRT2BVD5EQ4YYKYmRI3vP8GF5xUB5xQIX6hQbBCdEu7mkZMy4YsDGLH7kg", "2.x", false, onLoad);
			}
			
			@Override
			public void onFailure(Throwable reason)
			{
				Window.setStatus("Failed to load Google Maps");
			}
		});
	}

	private native static JavaScriptObject getAerialMapType() /*-{
		return $wnd.G_AERIAL_HYBRID_MAP;
	
	}-*/;
	
	protected void setupMapWidget()
	{
		
		map = new MapWidget();
		this.add(map);
		
		
		
		map.setWidth("100%");
		map.setHeight( Window.getClientHeight()*4/5 +  "px");
		//map.setZoomLevel(12);
		map.addControl(new LargeMapControl3D());
		map.addControl(new HierarchicalMapTypeControl());
		map.addControl(new ScaleControl());
		map.addControl(new OverviewMapControl());
		map.addMapType(MapType.getHybridMap());
		map.addMapType(MapType.getPhysicalMap());
		map.addMapType(MapType.getEarthMap());
		//map.addMapType(MapType.  getAerialMapType());
		map.setCurrentMapType(MapType.getHybridMap());
		map.setContinuousZoom(true);
		
		map.addMapMouseMoveHandler(new MouseMoveHandler());
		
		
		this.getElement().getStyle().setPosition(Position.RELATIVE);
		posDiv = new TransparentDiv();
		posDiv.getElement().getStyle().setTop(10, Unit.PX);
		posDiv.getElement().getStyle().setLeft(100, Unit.PX);
		posDiv.getElement().getStyle().setPosition(Position.ABSOLUTE);
		this.add(posDiv);
		posDiv.add(latLonLabel);
		posDiv.add(utmLabel);
		
		projection = new MercatorProjection(19);
		
		if (Window.Location.getParameter("theLIST")!=null)
		{
			
			TileLayer tl = new ListTileLayer(new CopyrightCollection());
			MapType mt = new MapType(new TileLayer[]{tl} , projection, "theLIST" );
		
			map.addMapType(mt);
		}
		
		//handlePoints();
		
		String url = kmlUrl;
		
		GeoXmlOverlay.load(url, new GeoXmlLoadCallback()
		{
			
			@Override
			public void onSuccess(String url, GeoXmlOverlay overlay)
			{
				map.addOverlay(overlay);
				overlay.gotoDefaultViewport(map);
				
				handlePoints();
			}
			
			@Override
			public void onFailure(String url, Throwable caught)
			{
				Window.setStatus("Failed to load map overlay");
			}
		});
		
	}

	private void handlePoints()
	{
		if (points != null && points.size() > 0)
		{
//			double centx=0;
//			double centy=0;
//			int count = 0;
			
			for (Node n : points)
			{
				Element point = (Element) n;
				
				final String easting = StringUtil.notNull(point.getAttribute("easting"));
				final String northing = StringUtil.notNull(point.getAttribute("northing"));
				final String code = StringUtil.notNull(point.getAttribute("code"));
				final String description = StringUtil.notNull(point.getAttribute("description"));
				
				double[] ll = GeoUtil.getLatLong(easting, northing);
				if (ll!=null)
				{
					LabelOverlay overlay = new LabelOverlay(LatLng.newInstance(ll[0], ll[1]), code + " - " + description);
					map.addOverlay(overlay);
				}
			}


		
		}
	}

	
	
//	centx += Double.valueOf(easting);
//	centy += Double.valueOf(northing);
//	count ++;
	
	//Icon
	
//	final Marker marker = new Marker(LatLng.newInstance(ll[0], ll[1]));
//	
//	map.addOverlay(marker );
//	
//	marker.addMarkerClickHandler(new MarkerClickHandler()
//	{
//		
//		@Override
//		public void onClick(MarkerClickEvent event)
//		{
//			map.getInfoWindow().open(marker.getLatLng(), 
//			        new InfoWindowContent(code + " - " + description));
//			
//		}
//	});
//	
//	marker.addMarkerInfoWindowOpenHandler(new MarkerInfoWindowOpenHandler()
//	{
//		
//		@Override
//		public void onInfoWindowOpen(MarkerInfoWindowOpenEvent event)
//		{
//			map.getInfoWindow().open(marker.getLatLng(), 
//			        new InfoWindowContent(code + " - " + description));
//			
//		}
//	});
//	centx = centx / count;
//	centy = centy / count;
//	double[] ll = getLatLong(centx, centy);
//	
//	map.setCenter(LatLng.newInstance(ll[0], ll[1]));	
	
	
	

	/**
	 * @return the kmlUrl
	 */
	public String getKmlUrl()
	{
		return kmlUrl;
	}

	/**
	 * @param kmlUrl the kmlUrl to set
	 */
	public void setKmlUrl(String kmlUrl)
	{
		this.kmlUrl = kmlUrl;
	}
	
	private final class MouseMoveHandler implements MapMouseMoveHandler
	{
		

		@Override
		public void onMouseMove(MapMouseMoveEvent event)
		{
			final LatLng ll = event.getLatLng();
			
			DeferredCommand.addCommand(new Command()
			{
				
				@Override
				public void execute()
				{
					
					String latlong = LATFORMAT.format( ll.getLatitude() ) + "," + LATFORMAT.format( ll.getLongitude() ) ;
					latLonLabel.setText(latlong);
					
					String utm = coordinates.latLon2UTM(ll.getLatitude(), ll.getLongitude()).toString();
					utmLabel.setText(utm);
				}
			});
			
			
		}
	}
	
	public class ListTileLayer extends TileLayer
	{
		CopyrightCollection cc;
		
		
		public ListTileLayer(CopyrightCollection cc)
		{
			super(cc , 9, 19);
			cc.addCopyright(new Copyright(0, LatLngBounds.newInstance( LatLng.newInstance(-50, 130), LatLng.newInstance(-30, 150)), 8, "© Copyright State of Tasmania"));
		}

		@Override
		public double getOpacity()
		{	
			return 1;
		}		
		
		@Override
		public String getTileURL(Point tile, int zoomLevel)
		{
			// http://www.thelist.tas.gov.au/listmap/listmapgetmap?minx=513137.1966476798&miny=5249479.271861119&maxx=523105.2508787326&maxy=5252414.272&iwidth=1457&iheight=429&layers=17&disabledlayers=&imageno=5&grid=true&rasteralpha=10&vectoralpha=0&wmsalpha=10
						
			double[] rect = GoogleTileUtils.getTileRect(tile.getX(), tile.getY(), zoomLevel);
			
			UTM u1 = coordinates.latLon2UTM(rect[0], rect[1] );
			UTM u2 = coordinates.latLon2UTM(rect[2], rect[3] );
			
			String ret = "http://www.thelist.tas.gov.au/listmap/listmapgetmap?iwidth=256&iheight=256&layers=17&disabledlayers=&imageno=5&grid=false&scale=false&rasteralpha=10&vectoralpha=0&wmsalpha=10&minx=";
			ret += u1.getEasting();
			ret += "&maxy=";
			ret += u1.getNorthing();
			ret += "&maxx=";
			ret += u2.getEasting();
			ret += "&miny=";
			ret += u2.getNorthing();
			
			return ret;
		}

		@Override
		public boolean isPng()
		{
			return false;
		}
		
	}
	
}
