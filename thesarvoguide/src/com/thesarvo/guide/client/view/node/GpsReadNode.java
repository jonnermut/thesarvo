package com.thesarvo.guide.client.view.node;

import java.util.List;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.http.client.URL;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.xphone.client.event.ViewTransition;
import com.thesarvo.xphone.client.event.ViewTransitionEvent;
import com.thesarvo.xphone.client.model.simplebind.XmlSimpleModel;
import com.thesarvo.xphone.client.phonegap.NativeMap;
import com.thesarvo.xphone.client.phonegap.NativeMapView;
import com.thesarvo.xphone.client.phonegap.PhoneGap;
import com.thesarvo.xphone.client.ui.widgets.simplebind.FlexTable;
import com.thesarvo.xphone.client.util.BrowserUtil;
import com.thesarvo.xphone.client.xpath.XPath;

public class GpsReadNode extends ReadNode
{
	
	private static final double LN2 = Math.log(2);

	//@UiField
	//PagingScrollTable<Point> table;
	
	//@UiField
	//Anchor googleMapsAnchor;
	
	@UiField
	Anchor googleEarthAnchor;
	
	@UiField
	MapPanel mapPanel;
	
	@UiField
	FlexTable gpsTable;
	
	@UiField
	Button mapButton2;
	
	@UiField
	DivElement linksDiv;
	
	interface MyUiBinder extends UiBinder<Widget, GpsReadNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	//private String kmlUrl;
	
	NativeMap nativeMap;

	private List<Node> nodes;

	public GpsReadNode()
	{
			
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));
			
//	    List<Point> points = new ArrayList<Point>();
//	    points.add(new Point("test","test2",1,2,3));
//	    points.add(new Point("test","test2",1,2,3));
//	    
//	    DefaultTableModel<Point> tableModel = new DefaultTableModel<Point>(points);
//
//
//	    table.setTableModel(tableModel);
//	    table.gotoFirstPage();
//	    table.getHeaderTable().setHeight("20px");
	    //table.getElement().getStyle().setOverflow(Overflow.VISIBLE);
	    //table.getHeaderTable().getElement().getStyle().setOverflow(Overflow.VISIBLE);
	    //table.getDataTable().getElement().getStyle().setOverflow(Overflow.VISIBLE);
	    
		super.init();
		
		nodes = XPath.selectNodes(((XmlSimpleModel)getModel()).getXml(), "point");
		
		//String baseUrl = "../../download/resources/confluence.extra.guide:guide/thesarvomaps.html?url=";
		
		//String kmlUrl = Controller.get().getServletUrl();
		
		// TODO - this has to be an absolute URL to work with good maps, get rid of hard codedness
		String kmlUrl = "http://www.thesarvo.com/confluence/plugins/servlet/ts.kml?pageId=" + Controller.get().getGuideId();
		
		/*
		baseUrl += URL.encodeComponent(kmlUrl);
		
		String zoom = "16";
		if (nodes!=null && nodes.size() > 10)
			zoom = "12";
		if (nodes!=null && nodes.size() > 30)
			zoom = "8";
		
		baseUrl += "&zoom=" + zoom;
		*/
		//googleMapsAnchor.setHref(baseUrl);
		
		googleEarthAnchor.setHref("../../plugins/servlet/ts.kml?pageId=" + Controller.get().getGuideId() );
		
		//setupMapsPanel(nodes);
		
		if (BrowserUtil.isMobileBrowser() && PhoneGap.isAvailable() && NativeMap.isAvailable() )
		{
			mapButton2.setVisible( true );
			mapButton2.addClickHandler(new MapButtonClickHandler());
		}
		else
			mapButton2.setVisible( false );
		
		
		
		if (! BrowserUtil.isMobileBrowser())
		{
		
			mapPanel.setKmlUrl(kmlUrl);
			//mapPanel.setPoints(nodes);
			mapPanel.init(nodes);
				
		}
		else
		{
			mapPanel.setVisible(false);
			googleEarthAnchor.setVisible(false);
			
			gpsTable.getColumnFormatter().addStyleName(5, Resources.INSTANCE.s().displayNone());
			gpsTable.getColumnFormatter().addStyleName(6, Resources.INSTANCE.s().displayNone());
			
		}
	}
	
	
	public class MapButtonClickHandler implements ClickHandler
	{

		@Override
		public void onClick(ClickEvent event)
		{
			NativeMapView.setPoints(nodes);
			
			// todo
			Controller.get().getEventBus().fireEvent(new ViewTransitionEvent(new ViewTransition("map", null, false, "Map")));
		}
		
	}
	

}
