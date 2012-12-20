package com.thesarvo.guide.client.phototopo;

import java.util.List;

import com.google.gwt.user.client.Event;
import com.thesarvo.guide.client.raphael.ClickCallback;
import com.thesarvo.guide.client.raphael.RaphaelJS;

public class Segment
{

	//String remove;
	RoutePoint point1;
	RoutePoint point2;
	int id;
	String svg_part;
	PhotoTopo phototopo;
	String pathPart;
	Route route;
	com.thesarvo.guide.client.raphael.Raphael.Path outline;
	com.thesarvo.guide.client.raphael.Raphael.Path ghost;
	com.thesarvo.guide.client.raphael.Raphael.Path curve;

	static int idCount = 0;
	private RaphaelJS.Element glow;
	
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

		// var offset, path, phototopo, options,nojs;

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

		String path = "M" + this.point1.x + " " + this.point1.y + " L"
				+ this.point2.x + " " + this.point2.y;
		this.svg_part = path;

		Console.log("Path ctor path:" + path);

		this.pathPart = " L" + this.point2.x + " " + this.point2.y;

		//this.outline = phototopo.path(path);
		if (!nojs)
		{
			this.ghost = phototopo.path(path);
			this.ghost.toBack();
		}
		//this.outline.toBack();

//		if (phototopo.getBackground() != null)
//		{
//			phototopo.getBackground().toBack();
//		}

		this.curve = phototopo.path(path);

		//this.outline.attr(Styles.outline());

		// TODO - manage glow on line?


//		if (this.point1.route.getAutoColorBorder() != null)
//		{
//			this.outline.attr("stroke", this.point1.route.getAutoColorBorder());
//		}

		if (!nojs)
		{
			this.ghost.attr(Styles.ghost(phototopo.getOptions().thickness));
		}
		this.curve.attr(Styles.stroke(phototopo.getOptions().thickness));

//		if (this.point1.route.getAutoColor() != null)
//		{
//			this.curve.attr("stroke", this.point1.route.getAutoColor());
//		}

		// TODO - not sure if these references will be needed
		// this.curve.path = this;
		// this.outline.path = this;
		// if (!nojs){
		// this.ghost.path = this;
		// }

		if (phototopo.getOptions().editable)
		{
			// commented it out and it still works fine! TODO
			this.point1.circle.toFront();
			this.point2.circle.toFront();
		}

		/*
		 * FIXME - event handlers this.curve.mouseover( mouseover );
		 * this.curve.mouseout( mouseout ); this.outline.mouseover( mouseover );
		 * this.outline.mouseout( mouseout ); if (!nojs){ this.ghost.mouseover(
		 * mouseover ); this.ghost.mouseout( mouseout ); }
		 * 
		 * this.curve.click(PathClick); this.outline.click(PathClick); if
		 * (!nojs){ this.ghost.click(PathClick); }
		 */
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
		SimplePoint handle1 = this.point1.pointGroup.getAngle(this.point1);
		SimplePoint handle2 = this.point2.pointGroup.getAngle(this.point2);

		// points,
		// path,
		// phototopo = this.point1.route.phototopo,
		// path_finish = "",
		// off1, off2, thickness,
		// delta, angle, aWidth, aHeight, size,
		// ex, ey;

		RoutePoint[] points = new RoutePoint[] {
				this.point1,
				new RoutePoint(this.point1.x + handle1.x, this.point1.y + handle1.y),
				new RoutePoint(this.point2.x - handle2.x, this.point2.y - handle2.y),

				this.point2 };

		// if (phototopo.options.seperateRoutes)
		// {
		// thickness = phototopo.options.thickness;
		// off1 = this.point1.pointGroup.getSplitOffset(this.point1) * thickness
		// * 1.4;
		// off2 = this.point2.pointGroup.getSplitOffset(this.point2) * thickness
		// * 1.4;
		// points = getBezierOffset(points, off1, off2);
		// }

		this.svg_part = "C" + points[1].x + "," + points[1].y + " "
				+ points[2].x + "," + points[2].y + " " + points[3].x + ","
				+ points[3].y;

		String path = "M" + points[0].x + "," + points[0].y + this.svg_part;

		/*
		 * End of path embellishments
		 * 
		 * delta = this.point2.pointGroup.getAngle(); angle =
		 * Math.atan2(delta.dy, delta.dx); size = phototopo.options.thickness *
		 * 0.5;
		 * 
		 * // x,y of end point ex = points[3].x; ey = points[3].y; // draw a T
		 * bar stop if (!this.point2.nextPoint && this.point2.type ==
		 * "jumpoff"){ aWidth = size*4; aHeight = size*0.1;
		 * 
		 * path_finish += offset(angle, ex, ey, 0, -aHeight ); // bottom middle
		 * path_finish += offset(angle, ex, ey, -aWidth, -aHeight ); // bottom
		 * left path_finish += offset(angle, ex, ey, -aWidth, aHeight ); // top
		 * left path_finish += offset(angle, ex, ey, aWidth, aHeight ); // top
		 * right path_finish += offset(angle, ex, ey, aWidth, -aHeight ); //
		 * bottom left path_finish += offset(angle, ex, ey, -aWidth, -aHeight );
		 * // bottom left
		 * 
		 * // If this is the end of the Path then draw an arrow head } else if
		 * (!this.point2.nextPoint && (this.point2.type == "none" ||
		 * !this.point2.type) ){ aWidth = size*1.5; aHeight = size*1.5;
		 * path_finish += offset(angle, ex, ey, 0, size*1.2 ); // middle
		 * path_finish += offset(angle, ex, ey, -aWidth, aHeight ); // bottom
		 * left path_finish += offset(angle, ex, ey, aWidth, aHeight ); //
		 * bottom right path_finish += offset(angle, ex, ey, 0, -size*2.3 ); //
		 * top path_finish += offset(angle, ex, ey, -aWidth, aHeight ); //
		 * bottom left path_finish += offset(angle, ex, ey, aWidth, aHeight );
		 * // bottom right } this.svg_part += path_finish; path += path_finish;
		 */

		Console.log("Path redraw path:" + path);
		this.curve.attr("path", path);

		// if (this.point1.type === "hidden"){
		// this.curve.attr(phototopo.styles.strokeHidden);
		// } else {
		// this.curve.attr(phototopo.styles.strokeVisible);
		// }

		//this.outline.attr("path", path);
		if (!phototopo.getOptions().editable)
		{
			this.ghost.attr("path", path);
			//this.ghost.toBack();
			glow = this.ghost.glow("black", 6);
			// glow.toBack();
			//glow.attr("opacity", 0.5);
		}

		
		curve.click(new ClickCallback()
		{
			
			@Override
			public void onClick(Event e)
			{
				route.onClick(e);
				e.stopPropagation();
			}
		});
		
		point1.bringCircleAndIconToFront();
		point2.bringCircleAndIconToFront();
	};

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
		
		if (outline != null)
			outline.remove();
		
		if (ghost != null)
			ghost.remove();
		
	}

}
