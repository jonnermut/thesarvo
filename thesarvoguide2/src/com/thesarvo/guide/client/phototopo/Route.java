package com.thesarvo.guide.client.phototopo;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.UIObject;
import com.thesarvo.guide.client.model.PathDrawingObject;
import com.thesarvo.guide.client.raphael.Raphael.Path;
import com.thesarvo.guide.client.raphael.Raphael.Shape;
import com.thesarvo.guide.client.raphael.RaphaelJS.Element;
import com.thesarvo.guide.client.util.StringUtil;

public class Route
{

	private PhotoTopo phototopo;
	// private String autoColor;
	// private String autoColorBorder;
	private List<RoutePoint> points = new ArrayList<RoutePoint>();
	private List<Segment> paths = new ArrayList<Segment>();

	private PathDrawingObject data;
	private Path curve;
	private Element glow;

	/**
	 * @constructor
	 * @param phototopo
	 *            the topo to add this route to
	 * @param id
	 *            - is a unique string identifying the route (eg a primary id in the
	 *            DB) #param order is a number used for sorting the routes into a
	 *            natural order (typically 1..x from left to right)
	 * @property {String} id the unique id of this route
	 */
	public Route(PhotoTopo phototopo, String id, PathDrawingObject rd)
	{
		this.data = rd;
		this.setPhototopo(phototopo);

	}

	/**
	 * @private
	 */
	RoutePoint addPoint(double x, double y, String type, Integer offset, boolean redraw)
	{
		Console.log("addPoint " + x + "," + y + "," + type);
		int c;
		Segment path;

		// if offset is not specified then add it at the end of the route
		if (offset == null)
		{
			offset = this.getPoints().size();
		}

		x = Math.floor(x);
		y = Math.floor(y);

		RoutePoint p = new RoutePoint(this, x, y, type, offset);

		// fix next and prev pointers
		if (offset > 0)
			p.prevPoint = this.getPoints().get(offset - 1);

		if (p.prevPoint != null)
		{
			p.nextPoint = p.prevPoint.nextPoint;
			p.nextPath = p.prevPoint.nextPath;
			p.prevPoint.nextPoint = p;
		}

		// what about p.next??

		// loop through and fix positions

		// each point has both next and prev points AND paths

		// add this point into the point list
		// this.points.splice(offset, 0, p);
		getPoints().add(offset, p);

		// recalc the points positions
		for (c = this.getPoints().size() - 1; c > offset; c--)
		{
			this.getPoints().get(c).position = c;
		}
		if (p.nextPoint != null)
		{
			p.nextPoint.prevPoint = p;
		}

		// if more than one point make a path
		if (this.getPoints().size() > 1 && offset > 0)
		{
			Console.log("Making path");
			path = new Segment(this.getPoints().get(offset - 1), this.getPoints().get(offset));
			// this.paths.splice(offset-1, 0, path);

			if (offset > this.getPaths().size())
			{
				for (int i = 0; i < offset - getPaths().size(); i++)
					this.getPaths().add(null);
			}
			getPaths().add(offset - 1, path);

			if (this.getPaths().get(offset) != null)
			{
				this.getPaths().get(offset).point1 = p;
			}
		}

		// this.getPhototopo().saveData();
		this.getPhototopo().updateHint();

		if (redraw)
		{
			if (p.nextPoint != null)
			{
				p.nextPoint.pointGroup.redraw(null);
			}
			if (p.prevPoint != null)
			{
				p.prevPoint.pointGroup.redraw(null);
			}
			p.pointGroup.redraw(null);
		}

		return p;
	};

	/**
	 * @private add"s a new point to a route, optionally after the point
	 * 
	 */
	RoutePoint addAfter(RoutePoint afterPoint, double x, double y, String type)
	{

		Integer pos = afterPoint != null ? afterPoint.position + 1 : null;
		RoutePoint newPoint = this.addPoint(x, y, type, pos, true);
		newPoint.select();

		saveData();

		return newPoint;
	};

	public void updateLabel()
	{
		Console.log("updateLabel " + this);

		setLabel(data.getLabelText(), data.getLabelClasses());
	}

	/**
	 * @private sets the label for this route The label may appear in more than one
	 *          place if selected if will have a class of "selected" it may also
	 *          have a class of "start"
	 */
	void setLabel(String labelText, String labelClasses)
	{
		// this.data.setLabelText(labelText);
		// if (labelClasses != null)
		// this.data.setLabelClasses(labelClasses);

		if (labelText != null && this.getPoints().size() > 0)
		{
			boolean found = false;
			this.getPoints().get(0).setLabel("", "");

			for (RoutePoint p : getPoints())
			{
				if ("label".equals(p.getType()))
				{
					found = true;
					p.setLabel("start " + this.data.getLabelClasses(), this.data.getLabelText());
				}
			}

			if (!found)
				this.getPoints().get(0).setLabel("start " + this.data.getLabelClasses(), this.data.getLabelText());

		}
		// else draw the label somewhere else so notify that it is missing??
	};

	/**
	 * @private save the data down to the page to be serialised in some form
	 * @returns a json strucure with all point data
	 */
	void saveData()
	{

		String svg = updateSvgPath();

	}

	String oneDP(double d)
	{
		return Segment.oneDP(d);
	}

	private String updateSvgPath()
	{
		String spoints = "";
		String svg = "";
		for (RoutePoint point : points)
		{
			if (spoints.length() > 0)
				spoints += " ";
			else
			{
				svg += "M" + oneDP(point.x) + "," + oneDP(point.y);
			}
			spoints += oneDP(point.x) + "," + oneDP(point.y);

			if (point.getType() != null && point.getType() != "none")
			{
				spoints += "," + point.getType();
			}

			if (point.nextPath != null)
			{
				svg += point.nextPath.svg_part;
			}
		}
		Console.log("saveData:" + spoints);
		data.setPoints(spoints);
		data.setSvgPath(svg);
		return svg;
	};

	/**
	 * @private select this route, and optionally specifies which point to select
	 *          within the route if no point specifices selects the last point in
	 *          the route (if it has any points at all)
	 */
	void select(RoutePoint selectedPoint)
	{

		Route previousRoute = getPhototopo().selectedRoute;

		int c;

		if (getPhototopo().selectedRoute == this && selectedPoint == getPhototopo().getSelectedPoint())
		{
			return;
		}

		if (previousRoute != null && previousRoute != this)
		{
			previousRoute.deselect();
		}

		getPhototopo().selectedRoute = this;

		// if (this.data.getLabelText() != null && this.getPoints().size() > 0)
		// {
		// this.getPoints().get(0).setLabel("selected start " +
		// this.data.getLabelClasses(),
		// this.data.getLabelText());
		// }

		if (selectedPoint == null)
		{
			if (this.getPoints().size() > 0)
			{
				selectedPoint = this.getPoints().get(this.getPoints().size() - 1);
			}
		}
		getPhototopo().setSelectedPoint(selectedPoint);
		if (selectedPoint != null)
		{
			selectedPoint.select(true);
		}

		if (getPhototopo().isEditable())
		{

			// now highlight the new route and make sure it is at the front
			for (Segment segment : getPaths())
			{
				if (segment != null && segment.curve != null)
				{
					segment.curve.attr(Styles.strokeSelected(getPhototopo().getOptions().thickness));

					segment.point2.circle.attr(Styles.handleSelected());

				}

			}
			if (getPoints().size() > 0)
			{
				this.getPoints().get(0).circle.attr(Styles.handleSelected());
			}
		}
		else
		{
			this.curve.attr(Styles.strokeSelected(getPhototopo().getOptions().thickness));
		}

		getPhototopo().updateHint();

	};

	/**
	 * @private deselect this route
	 */
	void deselect()
	{
		Console.log("deselect " + this);

		getPhototopo().selectedRoute = null;
		getPhototopo().setSelectedPoint(null);

		if (getPhototopo().isEditable())
		{
			for (Segment path : getPaths())
			{
				if (path != null && path.curve != null)
				{
					path.curve.attr(getRouteCurveAttr());
				}
			}

			for (RoutePoint p : getPoints())
			{
				p.circle.attr(Styles.handle());

			}
		}
		else
		{
			this.curve.attr(getRouteCurveAttr());
		}

		getPhototopo().updateHint();

	};

	/**
	 * @private redraw all components of this route
	 */
	void redraw()
	{
		Console.log("redraw " + this);

		boolean editable = phototopo.isEditable();

		for (Segment path : getPaths())
		{
			if (path != null)
				path.redraw();
		}

		if (!editable)
		{
			String svg = updateSvgPath();

			this.curve = this.phototopo.path(svg);
			this.curve.attr(getRouteCurveAttr());

			// this.ghost.attr("path", path);
			// this.ghost.toBack();
			glow = this.curve.glow("black", 6);
			// glow.toBack();
			// glow.attr("opacity", 0.5);

			phototopo.addPathEventHandlers(curve, this);

			boolean arrow = getData().getArrow();
			applyArrowStyle(this.curve, arrow);
		}

		bringLabelAndPointsToFront();
	}

	public void bringLabelAndPointsToFront()
	{
		for (RoutePoint point : points)
		{
			point.bringCircleAndIconToFront();
		}

		updateLabel();
	}

	public void onClick(Event e, UIObject source)
	{
		getPhototopo().routeClicked(this, e, source);

	}

	public String getId()
	{
		return data.getId();
	}

	private void setId(String id)
	{
		this.data.setId(id);
	}

	public List<Segment> getPaths()
	{
		return paths;
	}

	public void setPaths(List<Segment> paths)
	{
		this.paths = paths;
	}

	public List<RoutePoint> getPoints()
	{
		return points;
	}

	public void setPoints(List<RoutePoint> points)
	{
		this.points = points;
	}

	public PhotoTopo getPhototopo()
	{
		return phototopo;
	}

	public void setPhototopo(PhotoTopo phototopo)
	{
		this.phototopo = phototopo;
	}

	public void remove()
	{
		// Window.alert("to do");

		if (curve != null)
			curve.remove();

		if (glow != null)
			glow.remove();

		for (Segment s : paths)
		{
			if (s != null)
				s.remove();
		}
		for (RoutePoint p : points)
		{
			p.removeShapes();
		}

		if (data != null)
			data.remove();
	}

	public void init()
	{
		String spoints = data.getPoints();
		if (spoints != null)
		{
			// try
			// {
			//
			String[] points = spoints.trim().split("\\s");
			for (int pc = 0; pc < points.length; pc++)
			{
				String[] parts = points[pc].trim().split(",");
				// if (parts[0] == "")
				// {
				// parts.splice(0,1);
				// }

				if (parts.length > 1 && StringUtil.isNotEmpty(parts[0]) && StringUtil.isNotEmpty(parts[1]))
				{
					double dx = Double.parseDouble(parts[0]);
					double dy = Double.parseDouble(parts[1]);
					String type = "";
					if (parts.length > 2)
						type = parts[2];

					this.addPoint(dx, dy, type, null, false);
				}
			}
		}

		updateLabel();

	}

	/**
	 * @return the data
	 */
	public PathDrawingObject getData()
	{
		return data;
	}

	/**
	 * @param data
	 *            the data to set
	 */
	public void setData(PathDrawingObject data)
	{
		this.data = data;
	};

	public void applyArrowStyle(Shape shape, boolean arrow)
	{
		String style = arrow ? "block-wide-long" : "none";
		shape.attr("arrow-end", style);
	}

	public JavaScriptObject getRouteCurveAttr()
	{
		String lineStyle = this.getData().getLineStyle();

		if (lineStyle.equals("dashed"))
		{
			return Styles.stroke_dash(getPhototopo().getOptions().thickness);
		}
		else if (lineStyle.equals("dotted"))
		{
			return Styles.stroke_dot(getPhototopo().getOptions().thickness);
		}
		else
		{
			return Styles.stroke(getPhototopo().getOptions().thickness);
		}

	}

	@Override
	public String toString()
	{
		return "Route [" + data.getId() + "]";
	}

	/**
	 * @private
	 */

	/*
	 * FIXME - route mouse handlers
	 * 
	 * Route.prototype.onmouseover = function(point){
	 * $(this.phototopo.photoEl).addClass("route"); if (this ===
	 * this.phototopo.selectedRoute){
	 * $(this.phototopo.photoEl).addClass("selectedRoute"); }
	 * 
	 * if (this.phototopo.options.onmouseover){
	 * this.phototopo.options.onmouseover(this); } };
	 * 
	 * Route.prototype.onmouseout = function(point){
	 * $(this.phototopo.photoEl).removeClass("route selectedRoute");
	 * 
	 * if (this.phototopo.options.onmouseout){
	 * this.phototopo.options.onmouseout(this); } };
	 * 
	 * Route.prototype.onclick = function(point){ if
	 * (this.phototopo.options.onclick){ this.phototopo.options.onclick(this); } };
	 */

}
