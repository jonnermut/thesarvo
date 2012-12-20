package com.thesarvo.guide.client.phototopo;

import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.VerticalPanel;


public class PointPopover extends PopupPanel
{
	RoutePoint point;
	public PointPopover(RoutePoint point)
	{
		super();
		this.point = point;
		
		VerticalPanel vp = new VerticalPanel();
		vp.setWidth("200px");
		Button button = new Button("Remove");
		vp.add(button);
		setWidget(vp);
	}
}
