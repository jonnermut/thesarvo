package com.thesarvo.guide.client.phototopo;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.UIObject;
import com.thesarvo.guide.client.model.PathDrawingObject;
import com.thesarvo.guide.client.util.StringUtil;

public class Route
{

	private PhotoTopo phototopo;
	//private String autoColor;
	//private String autoColorBorder;
	private List<RoutePoint> points = new ArrayList<RoutePoint>();
	private List<Segment> paths = new ArrayList<Segment>();
	
	private PathDrawingObject data;

	/**
	 * @constructor
	 * @param phototopo
	 *            the topo to add this route to
	 * @param id
	 *            - is a unique string identifying the route (eg a primary id in
	 *            the DB) #param order is a number used for sorting the routes
	 *            into a natural order (typically 1..x from left to right)
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
			path = new Segment(this.getPoints().get(offset - 1),
					this.getPoints().get(offset));
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

		//this.getPhototopo().saveData();
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
		setLabel(data.getLabelText(), data.getLabelClasses());
	}
	
	/**
	 * @private sets the label for this route The label may appear in more than
	 *          one place if selected if will have a class of "selected" it may
	 *          also have a class of "start"
	 */
	void setLabel(String labelText, String labelClasses)
	{
		//this.data.setLabelText(labelText);
		//if (labelClasses != null)
		//	this.data.setLabelClasses(labelClasses);

		if (labelText != null && this.getPoints().size() > 0)
		{
			boolean found = false;
			this.getPoints().get(0).setLabel("","");
			
			for (RoutePoint p : getPoints())
			{
				if ("label".equals(p.getType() ) )
				{
					found = true;
					p.setLabel("start " + this.data.getLabelClasses(),this.data.getLabelText());
				}
			}
			
			if (!found)
				this.getPoints().get(0).setLabel("start " + this.data.getLabelClasses(),this.data.getLabelText());
			
				
		}
		// else draw the label somewhere else so notify that it is missing??
	};
	
	/**
	 * @private save the data down to the page to be serialised in some form
	 * @returns a json strucure with all point data
	 */
	void saveData()
	{
		/*
		 * FIXME - save data var routeId, data = {routes: [], changed: false },
		 * route, routeData; if (this.loading){ return; } if (this.changed){
		 * data.changed = true; } if (!this.changed){ this.changed = true; } if
		 * (!this.options.onchange ){ return; }
		 * 
		 * for(routeId in this.routes){ route = this.routes[routeId];
		 * data.routes[data.routes.length] = route.getJSON(); }
		 * 
		 * this.options.onchange(data);
		 */
		
		String spoints = "";
		String svg = "";
		for (RoutePoint point: points)
		{
			if (spoints.length() > 0)
				spoints += " ";
			else
			{
				svg += "M" + (int)point.x + "," + (int)point.y;
			}
			spoints += (int)point.x + "," + (int)point.y;
			
			if (point.getType() != null && point.getType() != "none")
			{
				spoints += "," + point.getType();
			}
			
			if (point.nextPath !=null)
			{ 
				svg += point.nextPath.svg_part; 
			} 
		}
		Console.log("saveData:" + spoints);
		data.setPoints(spoints);
		data.setSvgPath(svg);
	};

	/**
	 * @private serialise the point data and send back to the page to be saved
	 */
	/*
	 * FIXME - serialise route Route.prototype.getJSON = function(){ var points
	 * = "", path = "", point, c; for(c=0; c<this.points.length; c++){ point =
	 * this.points[c]; if (c!== 0){ points += ","; } else { path += "M" +
	 * point.x + " "+point.y; } points += point.x + " " + point.y; if
	 * (point.type && point.type != "none"){ points += " " + point.type; } if
	 * (point.nextPath){ path += point.nextPath.svg_part; } } return { id:
	 * this.id, points: points, // svg_path: path, order: this.order }; };
	 */

	/**
	 * @private select this route, and optionally specifies which point to
	 *          select within the route if no point specifices selects the last
	 *          point in the route (if it has any points at all)
	 */
	void select(RoutePoint selectedPoint)
	{

		Route previousRoute = getPhototopo().selectedRoute;

		int c;

		if (getPhototopo().selectedRoute == this
				&& selectedPoint == getPhototopo().getSelectedPoint())
		{
			return;
		}

		if (previousRoute != null && previousRoute != this)
		{
			previousRoute.deselect();
		}

		getPhototopo().selectedRoute = this;

//		if (this.data.getLabelText() != null && this.getPoints().size() > 0)
//		{
//			this.getPoints().get(0).setLabel("selected start " + this.data.getLabelClasses(),
//					this.data.getLabelText());
//		}

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

		/*
		 * FIXME - on select handler if (phototopo.options.onselect){
		 * phototopo.options.onselect(this); }
		 */

		// now highlight the new route and make sure it is at the front
		for (Segment path : getPaths())
		{
			if (path != null)
			{
				//path.outline.attr(Styles.outlineSelected());
				// FIXME ?? .insertBefore(phototopo.layerRoutesSel);

				path.curve.attr(Styles
						.strokeSelected(getPhototopo().getOptions().thickness));
				// .insertBefore(phototopo.layerRoutesSel);

				if (getPhototopo().getOptions().editable)
				{
					path.point2.circle.attr(Styles.handleSelected());
				}
			}

		}

		if (getPhototopo().getOptions().editable)
		{

			if (getPoints().size() > 0)
			{
				this.getPoints().get(0).circle.attr(Styles.handleSelected());// .insertBefore(phototopo.layerRoutesSel);
			}
		}

		getPhototopo().updateHint();


	};

	/**
	 * @private deselect this route
	 */
	void deselect()
	{

		// var autoColor = this.autoColor,
		// autoColorBorder = this.autoColorBorder,
		// phototopo = this.phototopo,
		int c;

		// FIXME - route deselect
		// if (phototopo.options.ondeselect){
		// phototopo.options.ondeselect(this);
		// }

		getPhototopo().selectedRoute = null;
		getPhototopo().setSelectedPoint(null);

		for (Segment path : getPaths())
		{
			if (path != null)
			{
				path.curve.attr(Styles.stroke(getPhototopo().getOptions().thickness));
				//path.outline.attr(Styles.outline());


			}
		}
		if (getPhototopo().getOptions().editable)
		{
			for (RoutePoint p : getPoints())
			{
				p.circle.attr(Styles.handle());

			}
		}
//		if (this.data.getLabelText() != null && this.getPoints().size() > 0)
//		{
//			this.getPoints().get(0).setLabel("start " + this.data.getLabelClasses(),
//					this.data.getLabelText());
//		}
		getPhototopo().updateHint();


	};

	/**
	 * @private redraw all components of this route
	 */
	void redraw()
	{
		for (Segment path : getPaths())
		{
			if (path != null)
				path.redraw();
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
		Window.alert("to do");
		
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
	 * @param data the data to set
	 */
	public void setData(PathDrawingObject data)
	{
		this.data = data;
	};

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
	 * (this.phototopo.options.onclick){ this.phototopo.options.onclick(this); }
	 * };
	 */

}
