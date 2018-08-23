package com.thesarvo.guide.client.phototopo;

import java.util.List;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.event.dom.client.MouseOverEvent;
import com.google.gwt.event.dom.client.MouseOverHandler;
import com.google.gwt.i18n.client.NumberFormat;
import com.thesarvo.guide.client.raphael.RaphaelJS;
import com.thesarvo.guide.client.util.StringUtil;

public class Segment
{
	static NumberFormat nf = NumberFormat.getFormat(".#");
	public static String oneDP(double d)
	{
		return nf.format(d);
	}

	//String remove;
	RoutePoint point1;
	RoutePoint point2;
	int id;
	String svg_part;
	PhotoTopo phototopo;
	String pathPart;
	Route route;

	com.thesarvo.guide.client.raphael.Raphael.Path curve;

	static int idCount = 0;
	private String path;
	
	public void redraw()
	{
		redraw(null);

	}

	/**
	 * @private a path connects two points
	 * @constructor
	 * @param {Point} point1 The starting point
	 * @param {Point} point2 The ending point
	 */
	Segment(RoutePoint point1, RoutePoint point2)
	{
		this.point1 = point1;
		this.point2 = point2;
		this.id = getID();
		this.svg_part = "";
		this.point1.nextPath = this;
		this.point2.prevPath = this;
		this.route = point1.route;

		phototopo = this.point1.route.getPhototopo();
		PhotoTopoOptions options = phototopo.getOptions();
		boolean nojs = options.nojs;

		String path = "M" + oneDP(this.point1.x) + " " + oneDP(this.point1.y) + " L"
				+ oneDP(this.point2.x) + " " + oneDP(this.point2.y);
		this.svg_part = path;

		Console.log("Path ctor path:" + path);

		this.pathPart = " L" + oneDP(this.point2.x) + " " + oneDP(this.point2.y);



		if (phototopo.isEditable())
		{


//			if (phototopo.getBackground() != null)
//			{
//				phototopo.getBackground().toBack();
//			}

			// the base path (straight lines)
			this.curve = phototopo.path(path);

			this.curve.attr(route.getRouteCurveAttr());
			
			this.point1.circle.toFront();
			this.point2.circle.toFront();
		}


	}



	int getID()
	{

		return idCount++;
	}

	/*
	 * FIXME - event handlers function mouseover(event){
	 * this.path.point1.route.onmouseover();
	 * $(this.path.point1.route.phototopo.photoEl).addClass("split");
	 * this.path.point1.route.phototopo.updateCursor(); } function
	 * mouseout(event){ this.path.point1.route.onmouseout();
	 * $(this.path.point1.route.phototopo.photoEl).removeClass("split");
	 * this.path.point1.route.phototopo.updateCursor(); }
	 * 
	 * 
	 * 
	 * function PathClick(event){ var route = phototopo.selectedRoute, opts =
	 * phototopo.options, path = this.path; if (!phototopo.options.editable){
	 * this.path.point1.select(); if (opts.onclick){
	 * opts.onclick(this.path.point1.route); } return; } if (route){ if
	 * (path.point1.route === route){ path.point1.select(); } offset =
	 * $(phototopo.photoEl).offset();
	 * 
	 * route.addAfter(phototopo.selectedPoint, event.clientX - offset.left +
	 * $(window).scrollLeft(), event.clientY - offset.top +
	 * $(window).scrollTop() ); } else { this.path.point1.select(); } }
	 */

	String offset(double angle, double x, double y, double dx, double dy)
	{
		long ddx = Math
				.round((x - Math.sin(angle) * dx - Math.cos(angle) * dy) * 10) / 10;
		long ddy = Math
				.round((y + Math.cos(angle) * dx - Math.sin(angle) * dy) * 10) / 10;
		return "L" + ddx + " " + ddy + " ";
	}

	/*
	 * @private changes the start point
	 */
	void redraw(RoutePoint point)
	{
		updateSvgPath();

		Console.log("Path redraw path:" + path);
		
		// apply curves to flat path. We only do this in edit mode, otherwise the Route draws the path.		
		if (phototopo.isEditable())
		{
			final com.thesarvo.guide.client.raphael.Raphael.Path curve = this.curve;
			final Route route = this.route;
			
			this.curve.attr("path", path);

			boolean arrow = (point2.nextPath == null) && route.getData().getArrow();
			route.applyArrowStyle(curve, arrow);
			
			phototopo.addPathEventHandlers(curve, route);
			
			point1.bringCircleAndIconToFront();
			point2.bringCircleAndIconToFront();
		}
		

	}

	private void updateSvgPath()
	{
		SimplePoint handle1 = this.point1.pointGroup.getAngle(this.point1);
		SimplePoint handle2 = this.point2.pointGroup.getAngle(this.point2);

		RoutePoint[] points = new RoutePoint[] {
				this.point1,
				new RoutePoint(this.point1.x + handle1.x, this.point1.y + handle1.y),
				new RoutePoint(this.point2.x - handle2.x, this.point2.y - handle2.y),

				this.point2 };

		this.svg_part = "C" + oneDP(points[1].x) + "," + oneDP(points[1].y) + " "
				+ oneDP(points[2].x) + "," + oneDP(points[2].y) + " " + oneDP(points[3].x) + ","
				+ oneDP(points[3].y);

		path = "M" + oneDP(points[0].x) + "," + oneDP(points[0].y) + this.svg_part;
	}

	double secant(double theta)
	{
		return 1 / Math.cos(theta);
	}

	/*
	 * takes a set of points that defines a bezier curve and offsets it
	 */
	List<RoutePoint> getBezierOffset(List<RoutePoint> pointsList, double offset1,
			double offset2)
	{
		List<RoutePoint> res = null;
		/*
		 * FIXME
		 * 
		 * Point[] points = pointsList.toArray(new Point[0]);
		 * 
		 * //var res = [{}], int c; int size = pointsList.size() -1; double[]
		 * angles = new double[size];
		 * 
		 * double offset, offSec, angleAvg; for(c=0; c<3; c++){ angles[c] =
		 * Math.atan2(points[c+1].y - points[c].y, points[c+1].x - points[c].x);
		 * }
		 * 
		 * res.add( new Point()) res[0] = { x: points[0].x - offset1 *
		 * Math.sin(angles[0]), y: points[0].y + offset1 * Math.cos(angles[0])
		 * };
		 * 
		 * for(c=1; c<size; c++){ offset = (offset1 * (size-c)) / size +
		 * (offset2 * c)/size; offSec = offset * secant((angles[c] -
		 * angles[c-1])/2); angleAvg = (angles[c]+angles[c-1])/2; res[c] = { x:
		 * points[c].x - offSec * Math.sin(angleAvg), y: points[c].y + offSec *
		 * Math.cos(angleAvg) }; }
		 * 
		 * res[size] = { x: points[size].x - offset2 * Math.sin(angles[size-1]),
		 * y: points[size].y + offset2 * Math.cos(angles[size-1]) }; for(c=0;
		 * c<res.length; c++){ res[c].x = Math.round(res[c].x); res[c].y =
		 * Math.round(res[c].y); }
		 */
		return res;

	}

	public void removeAllCurves()
	{
		if (curve != null)
			curve.remove();
		
	}

	public void remove()
	{
		removeAllCurves();
		
		
	}

}
