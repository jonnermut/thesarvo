package com.thesarvo.guide.client.phototopo;

import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.logical.shared.CloseEvent;
import com.google.gwt.event.logical.shared.CloseHandler;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.PushButton;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.node.ClimbReadNode;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class RoutePopover extends PopupPanel
{
	String id;
	PhotoTopo phototopo;
	
	public RoutePopover(String _climbid, PhotoTopo _phototopo)
	{
		super(true, false);
		
		this.id = _climbid;
		this.phototopo = _phototopo;
		
		this.phototopo.setRoutePopoverIsVisible(true);
		
		this.setWidth("480px");
		this.getElement().getStyle().setZIndex(5);
		this.setStyleName("routePopup");
		
		FlowPanel inner = new FlowPanel();
		inner.getElement().getStyle().setPadding(8, Unit.PX);
		inner.getElement().getStyle().setPosition(Position.RELATIVE);
		this.add(inner);
		
		PushButton pb = new PushButton(new Image(Resources.INSTANCE.fancyClose()));
		
		
		pb.setStyleName("popupCloseButton");
		
		pb.addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				// fire close handler
				hide();
			}
		});
		
		this.addCloseHandler(new CloseHandler<PopupPanel>()
		{
			@Override
			public void onClose(CloseEvent<PopupPanel> closeEvent)
			{
				// Console.log("phototopo Closed");
				phototopo.routePopoverClosed();
			}
		});
		
		ClimbReadNode crn = new ClimbReadNode();
		Node n = Controller.get().getNode(this.id);
		if (n!=null)
		{
			crn.setModel(new XmlSimpleModel(n));
			crn.init();
			crn.setWidgetValuesFromModel();
			inner.add(crn);
		}
		inner.add(pb);
	}
}
