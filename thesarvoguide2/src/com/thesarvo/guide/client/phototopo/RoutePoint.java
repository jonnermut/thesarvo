package com.thesarvo.guide.client.phototopo;

import com.google.gwt.dom.client.Style.Cursor;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.ui.UIObject;
import com.thesarvo.guide.client.raphael.Attr;
import com.thesarvo.guide.client.raphael.ClickCallback;
import com.thesarvo.guide.client.raphael.DblClickCallback;
import com.thesarvo.guide.client.raphael.DragCallback;
import com.thesarvo.guide.client.raphael.MouseoverCallback;
import com.thesarvo.guide.client.raphael.Raphael;
import com.thesarvo.guide.client.raphael.Raphael.Circle;
import com.thesarvo.guide.client.util.StringUtil;

public class RoutePoint extends SimplePoint
{
	

	private static final String BELAY_DOT_BLUE = "#262262";



	private final class PointClick implements ClickCallback
	{
		UIObject source;
		
		public PointClick(UIObject source)
		{
			this.source = source;
		}
		
		@Override
		public void onClick(Event e)
		{
			route.onClick(e, source);
			
		}
	}



	private final class PointMouseOver implements MouseoverCallback
	{
		@Override
		public void onMouseOver()
		{
			phototopo.routeMouseOver(route);
			
		}

		@Override
		public void onMouseOut()
		{
			phototopo.routeMouseOver(null);
			
		}
	}



	double ox, oy;
	private String type;
	int position;
	Route route;
	
	private Raphael.Shape iconElement;
	RoutePoint nextPoint;
	RoutePoint prevPoint;
	Segment nextPath;
	Segment prevPath;
	PointGroup pointGroup;
	Raphael.Circle circle;
	
	Raphael.Circle labelElement;
	Raphael.Text labelText;
	String remove;
	private PhotoTopo phototopo;

	/**
	 * @private there is one point for every point on a route - two points can
	 *          occupy the same location
	 * @constructor
	 * @param {Route}
	 * @param {Integer} x x cordinate
	 * @param {Integer} y y coordinate
	 * @param {Integer} position where along the route it is added
	 */
	RoutePoint(Route route, double x, double y, String type, int position)
	{
		super(x,y);
		
		// var styles,
		// circle,
		// point = this;
		this.route = route;
		this.phototopo = route.getPhototopo();


		this.position = position;

		this.labelElement = null;
		this.iconElement = null;

		this.nextPoint = null;
		this.prevPoint = null;
		this.nextPath = null;
		this.prevPath = null;

		this.pointGroup = phototopo.getPointGroup(this);

		// styles = phototopo.styles;

		if (type == null)
		{
			type = "none";
		}
		else
			this.setType(type);
		setupEditable();
	}



	public RoutePoint(double x, double y)
	{
		super(x,y);
	}

	void setupEditable()
	{
		if (phototopo.getOptions().editable)
		{

			this.circle = phototopo.circle(this.x, this.y, PhotoTopo.HANDLE_RADIUS);

			// circle.point = this;
			circle.attr(Styles.handle());
			circle.attr( new Attr().cursor(Cursor.POINTER));
			circle.toFront();
			
//			if (this.route.getAutoColor() != null)
//			{
//				circle.attr("fill", "" + this.route.getAutoColor());
//				circle.attr("stroke", this.route.getAutoColorBorder());
//			}
			
//			circle.addHandler(new ClickHandler()
//			{
//				@Override
//				public void onClick(ClickEvent event)
//				{
//					select(); 	
//					event.stopPropagation();
//				}			
//			}, ClickEvent.getType());
			
			circle.click(new ClickCallback()
			{
				
				@Override
				public void onClick(Event e)
				{
					select();
					e.stopPropagation();
					
				}
			});
			
			circle.dblclick(new DblClickCallback()
			{
				
				@Override
				public void onDblClick()
				{
					remove();
					
				}
			});

			circle.drag(new DragCallback()
			{
				
				@Override
				public void onStart(double x, double y)
				{
					//Console.log("Drag onstart");
					
					Route selectedRoute =phototopo.selectedRoute;
					
					phototopo.addClass("dragging");
							  
					ox = circle.attrAsDouble("cx"); 
					oy = circle.attrAsDouble("cy");
							  
					// don't allow draging of points if another route is selected if
					if (selectedRoute!=null && selectedRoute != route)
						return; 
					
					circle.animate(Styles.handleHover(), 100); 
					select();
					
				}
				
				@Override
				public void onMove(double dx, double dy, double x, double y)
				{
					//Console.log("Drag onMove " + dx + "," + "dy");
					
					Route selectedRoute =phototopo.selectedRoute;
					
					
					if (selectedRoute!=null && selectedRoute != route)
					{ 
						return; 
					} 
					RoutePoint p = moveTo(ox + dx, oy + dy); 
					circle.attr("cx", p.x).attr( "cy", p.y);
					
				}
				
				@Override
				public void onEnd()
				{
					//Console.log("Drag onEnd");
					
					Route selectedRoute = phototopo.selectedRoute;
					phototopo.removeClass("dragging");
					
					if (selectedRoute!=null && selectedRoute != route)
					{ 
						return; 
					}
					
					setStyle();
					redrawIcon();
					
				}
			});
			
			/*;
			 * circle.mouseover(function(){ // is it the last point of a routes?
			 * if (this.point.nextPoint){ $('#phototopoContextMenu
			 * .hidden').removeClass('disabled'); $('#phototopoContextMenu
			 * .jumpoff').addClass('disabled'); } else {
			 * $('#phototopoContextMenu .hidden').addClass('disabled');
			 * $('#phototopoContextMenu .jumpoff').removeClass('disabled'); }
			 * 
			 * $(this.point.route.phototopo.photoEl).addClass('point');
			 * 
			 * //this.point.setStyle();
			 * this.point.route.onmouseover(this.point);
			 * this.animate(styles.handleHover, 100); });
			 * circle.mouseout(function(){
			 * $(this.point.route.phototopo.photoEl).removeClass('point');
			 * this.point.route.onmouseout(this.point); this.point.setStyle();
			 * }); 
			 * 
			 * 
			 * $(circle.node).contextMenu({ menu: 'phototopoContextMenu' },
			 * function(action, el, pos) { point.setType(action);
			 * point.pointGroup.redraw(); point.route.phototopo.saveData();
			 * 
			 * });
			 */

		}

	}

	/**
	 * @private
	 */
	void setType(String type)
	{
		PhotoTopo topo = phototopo; // , point;
		if (!topo.getOptions().showPointTypes)
		{
			return;
		}
		this.type = type;

		
		redrawIcon();

		// if (this.circle != null)
		// this.circle.attr({fill:'green', r:50});
		
		

	}



	public void redrawIcon()
	{
		removeIcon();

		if (type == null || type == "" || type == "none" || type == "hidden"
				|| type == "jumpoff")
		{
			if (this.nextPath != null)
			{
				this.nextPath.redraw();
			}
			return;
		}
		if (this.nextPath != null)
		{
			this.nextPath.redraw();
		}

		if (this.iconElement == null)
		{
			// custom icons
			if (type.equals("lower"))
			{
				Console.log("Drawing lower off");
				String p = "M" + (this.x + 4) + "," + (this.y + 20)
						+ "h12 l-16,20 l-16,-20 h12 v-12.55"
						+ "c-8.239-2.7-14-9.76-14-18.179"
						+ "c0-9.94,8.05-17.99,18-17.99"
						+ "c9.939,0,18,8.05,18,18.57"
						+ "c0,8.88-6.419,16.25-14.859,17.73" + "v12.55z";

				this.iconElement = phototopo.path(p);
				this.iconElement.attr("fill", BELAY_DOT_BLUE).attr("stroke", "white")
						.attr("stroke-width", 2);

				this.iconElement.scale(0.4, 0.4);
				
				//if (!phototopo.getOptions().editable)
				//	this.iconElement.glow("#ffffff", 6);

			}
			else if (type.equals("lower-left"))
			{
				Console.log("Drawing lower off left");
				String p = "M" + (this.x + 4) + "," + (this.y + 20)
						+ "0,-22 32,0 32,0 0,22 0,22 -32,0 -32,0 0,-22 z m 46.88927,8.43972 c 7.87973,-6.63036 2.22729,-19.21139 -8.22248,-18.30135 -1.74173,0.15168 -4.98842,-0.31141 -7.21487,-1.02908 -3.48161,-1.12228 -4.58932,-1.07872 -7.91602,0.31126 -3.71649,1.55285 -3.95667,1.53279 -6.1337,-0.51243 l -2.26575,-2.12856 -1.12052,4.36022 c -0.61629,2.39812 -1.72746,6.51391 -2.46926,9.1462 -1.22719,4.35468 -1.19995,4.74242 0.3023,4.30268 0.90806,-0.26582 4.57603,-1.21688 8.15103,-2.11347 7.51626,-1.88505 8.67412,-2.67083 6.54238,-4.44002 -1.944,-1.61338 -1.95709,-2.66205 -0.0424,-3.3968 3.04826,-1.16972 4.00995,0.239 3.65473,5.35356 -0.30742,4.42633 -0.0144,5.30228 2.67307,7.98972 3.99717,3.99716 9.63715,4.18089 14.06147,0.45807 z m -12.25441,-1.5123 c -2.81584,-2.21494 -3.58785,-7.27822 -1.65921,-10.88193 0.80664,-1.50722 0.44777,-2.04168 -2.0717,-3.08528 -2.58167,-1.06936 -3.58936,-1.00378 -6.59414,0.4291 -3.42665,1.63405 -3.48736,1.75702 -1.79218,3.63017 1.40957,1.55756 1.48203,2.02392 0.36849,2.3716 -0.76237,0.23803 -2.92159,0.92444 -4.79828,1.52536 -1.87668,0.60092 -3.60886,0.89587 -3.84928,0.65545 -0.73641,-0.73641 0.87342,-8.52306 1.89226,-9.15274 0.52623,-0.32523 1.62052,-0.0405 2.43174,0.63277 1.17864,0.97818 1.82276,0.91068 3.2062,-0.336 2.60943,-2.35147 6.46337,-2.97301 9.77027,-1.57568 1.62853,0.68813 5.0914,1.28102 7.69527,1.31753 5.46275,0.0766 8.36516,2.28954 9.32999,7.11369 0.48281,2.41404 0.0446,3.73992 -2.06459,6.24652 -3.22699,3.83507 -7.85019,4.26736 -11.86484,1.10944 z" + "v12.55z";

				p = "M" + (this.x + 4) + "," + (this.y + 20)
						+ "h12 l-16,20 l-16,-20 h12 v-12.55"
						+ "c-8.239-2.7-14-9.76-14-18.179"
						+ "c0-9.94,8.05-17.99,18-17.99"
						+ "c9.939,0,18,8.05,18,18.57"
						+ "c0,8.88-6.419,16.25-14.859,17.73" + "v12.55z";

//				Trying to convert to svg from png...
//				p = "M" + (this.x + 4) + "," + (this.y + 20)
//						+ "0,-22 32,0 32,0 0,22 0,22 -32,0 -32,0 0,-22 z m 46.88927,8.43972 c 7.87973,-6.63036 2.22729,-19.21139 -8.22248,-18.30135 -1.74173,0.15168 -4.98842,-0.31141 -7.21487,-1.02908 -3.48161,-1.12228 -4.58932,-1.07872 -7.91602,0.31126 -3.71649,1.55285 -3.95667,1.53279 -6.1337,-0.51243 l -2.26575,-2.12856 -1.12052,4.36022 c -0.61629,2.39812 -1.72746,6.51391 -2.46926,9.1462 -1.22719,4.35468 -1.19995,4.74242 0.3023,4.30268 0.90806,-0.26582 4.57603,-1.21688 8.15103,-2.11347 7.51626,-1.88505 8.67412,-2.67083 6.54238,-4.44002 -1.944,-1.61338 -1.95709,-2.66205 -0.0424,-3.3968 3.04826,-1.16972 4.00995,0.239 3.65473,5.35356 -0.30742,4.42633 -0.0144,5.30228 2.67307,7.98972 3.99717,3.99716 9.63715,4.18089 14.06147,0.45807 z m -12.25441,-1.5123 c -2.81584,-2.21494 -3.58785,-7.27822 -1.65921,-10.88193 0.80664,-1.50722 0.44777,-2.04168 -2.0717,-3.08528 -2.58167,-1.06936 -3.58936,-1.00378 -6.59414,0.4291 -3.42665,1.63405 -3.48736,1.75702 -1.79218,3.63017 1.40957,1.55756 1.48203,2.02392 0.36849,2.3716 -0.76237,0.23803 -2.92159,0.92444 -4.79828,1.52536 -1.87668,0.60092 -3.60886,0.89587 -3.84928,0.65545 -0.73641,-0.73641 0.87342,-8.52306 1.89226,-9.15274 0.52623,-0.32523 1.62052,-0.0405 2.43174,0.63277 1.17864,0.97818 1.82276,0.91068 3.2062,-0.336 2.60943,-2.35147 6.46337,-2.97301 9.77027,-1.57568 1.62853,0.68813 5.0914,1.28102 7.69527,1.31753 5.46275,0.0766 8.36516,2.28954 9.32999,7.11369 0.48281,2.41404 0.0446,3.73992 -2.06459,6.24652 -3.22699,3.83507 -7.85019,4.26736 -11.86484,1.10944 z" + "v12.55z";

				// TODO: draw lower off with arrow to the left

				this.iconElement = phototopo.path(p);
				this.iconElement.attr("fill", BELAY_DOT_BLUE).attr("stroke", "white")
						.attr("stroke-width", 2);

				this.iconElement.scale(0.4, 0.4);
				this.iconElement.rotate(30);
			}
			else if (type.equals("lower-right"))
			{
				Console.log("Drawing lower off right");
				String p = "M" + (this.x + 4) + "," + (this.y + 20)
						+ "h12 l-16,20 l-16,-20 h12 v-12.55"
						+ "c-8.239-2.7-14-9.76-14-18.179"
						+ "c0-9.94,8.05-17.99,18-17.99"
						+ "c9.939,0,18,8.05,18,18.57"
						+ "c0,8.88-6.419,16.25-14.859,17.73" + "v12.55z";

				// TODO: draw lower off with arrow to the right

				this.iconElement = phototopo.path(p);
				this.iconElement.attr("fill", BELAY_DOT_BLUE).attr("stroke", "white")
						.attr("stroke-width", 2);

				this.iconElement.scale(0.4, 0.4);
				this.iconElement.rotate(-30);
			}
			else if (type.equals("belay"))
			{
				Console.log("Drawing belay");
				this.iconElement = phototopo.circle(this.x, this.y, 8);
				this.iconElement.attr("fill", BELAY_DOT_BLUE).attr("stroke", "white")
						.attr("stroke-width", 2).attr("r", 7);

				//if (!phototopo.getOptions().editable)
				//	this.iconElement.glow("#ffffff", 4);
				// this.iconEl.glowEl =
				// this.iconEl.glow({color:'#ffffff',width:4});
			}
			
			/*
			else
			{

				this.iconElement = phototopo.image(phototopo.getOptions().baseUrl + "images/"
						+ type + ".png", 0, 0, 16, 16);
			}
			*/
			
			if (iconElement != null)
			{
				iconElement.click(new PointClick(iconElement));
				iconElement.mouseover(new PointMouseOver());
			}
			


		}
		if (this.iconElement != null)
		{
			this.iconElement.setStyleName("pt_label pt_icon " + this.type);
			this.updateIconPosition();
			

		}
		
		bringCircleAndIconToFront();
	}



	public void removeIcon()
	{
		if (this.iconElement != null)
		{
			Console.log("icon removed");
			this.iconElement.remove();
		}
		this.iconElement = null;
	}

	/**
	 * @private
	 */
	void updateIconPosition()
	{

		//double offsetX = phototopo.getOptions().editable ? 8 : -8;
		//double offsetY = -8, top, left;
		double offsetX = 0, offsetY = 0;
		
		if (this.iconElement == null)
		{
			return;
		}
		double left = this.x + offsetX;
		double top = this.y + offsetY;

		this.iconElement.attr("x", left).attr("y", top);

	};

	/**
	 * @private
	 */
	void setLabel(String classes, String text)
	{

		double size = phototopo.getOptions().labelSize;

		if (StringUtil.isEmpty(text))
		{
			if (labelElement != null)
			{
				labelElement.remove();
				labelElement = null;
			}
			if (labelText != null)
			{
				labelText.remove();
				labelText = null;
			}
			
			return;
		}
		
		// draw the label elements
		if (this.labelElement == null)
		{
			// label = canvas.rect(this.x,this.y,size,size,0);

			labelElement = phototopo.circle(this.x, this.y, (int) (size / 2));
			// label.attr({fill: 'yellow', width: size, height: size, stroke:
			// 'black', 'stroke-width': topo.options.labelBorder });

			labelElement.attr("fill", "#000000").attr("stroke", "none")
					.attr("stroke-width", 1);

			labelText = phototopo.text(1, 1, text);
			labelText.attr(new Attr()
					.width(size).height(size)
					.fontSize(15).fontFamily("Impact,Tahoma,Helvetica")
					.fill("#ffffff"));


			if (labelElement != null)
			{
				labelElement.click(new PointClick(labelElement));
				labelElement.mouseover(new PointMouseOver());
				
				if (labelText != null)
				{
					labelText.click(new PointClick(labelText));
					labelText.mouseover(new PointMouseOver());

				}
			}

		}
		else
		{
			// elements already exist
			labelText.attr(new Attr().text(text));
			// TODO - classes
			
			labelElement.toFront();
			labelText.toFront();
			
		}
		
		//if (!phototopo.isLoading())
		//{
		this.updateLabelPosition();
		//}

		if (route.getData().isSportClimb())
			labelElement.attr("fill", "#ff0000");
		else
			labelElement.attr("fill", "#000000");
		
		labelElement.toFront();
		labelText.toFront();
		// TODO
		this.labelElement.setStyleName("pt_label " + classes);

		if (this.circle != null)
			this.circle.toFront();
	};

	/**
	 * @private remove a point from its route
	 */
	void remove()
	{

		remove = "todo";

		removeShapes();

		// remove from point group
		pointGroup.remove(this);
		pointGroup.redraw(this);
		pointGroup = null;

		// remove all handlers for the point and refs to/from dom
		Route r = this.route;

		// remove point from array
		r.getPoints().remove(this);

		// fix all position's of points after this one
		for (int c = position; c < r.getPoints().size(); c++)
		{
			r.getPoints().get(c).position = c;
		}

		// if one path then remove and relink
		if (prevPath != null)
		{
			// remove prev path and relink


			// fix point refs
			prevPoint.nextPoint = nextPoint;
			prevPoint.nextPath = nextPath;

			// fix path points
			if (nextPoint != null)
			{
				nextPoint.prevPoint = prevPoint;
			}
			if (nextPath != null)
			{
				nextPath.point1 = prevPoint;
			}

			// r.paths.splice(position-1, 1);
			r.getPaths().remove(position - 1);
			
			prevPath.removeAllCurves();
			
			// select prev point
			if (prevPoint !=null)
				prevPoint.select();
		}
		else if (nextPath != null)
		{
			// it is the first
			// if the first point then move the label to the next point
			// select next point
			

			nextPoint.prevPoint = null;
			nextPoint.prevPath = null;

			r.getPaths().remove(position);
			nextPath.removeAllCurves();
			// select next point
			nextPoint.select();

		}
		else
		{
			// TODO
			// just one point so delete it
		}



		if (phototopo.getSelectedPoint() == this)
		{
			phototopo.setSelectedPoint(null);
		}

		route.redraw();
		if (nextPoint != null)
		{
			nextPoint.pointGroup.redraw(null);
		}
		if (prevPoint != null)
		{
			prevPoint.pointGroup.redraw(null);
		}
		if (prevPoint != null && prevPoint.prevPoint == null)
		{
			prevPoint.updateLabelPosition();
		}
		
		route.saveData();



	}



	public void removeShapes()
	{
		// remove handle from raphael
		circle.remove();
		
		if (this.labelElement != null)
		{
			this.labelElement.remove();
			this.labelText.remove();
			this.labelElement = null;
			this.labelText = null;
		}
		removeIcon();
	}



	public void removeAllCurves(Segment path)
	{
		if (path != null)
			path.removeAllCurves();
		

	};

	/**
	 * @private updates the labels position
	 */
	void updateLabelPosition()
	{

		if (labelElement == null)
			return;
		

		Circle label = this.labelElement;

		label.toFront();
		labelText.toFront();
		
		double offsetX, offsetY = 0;
		double width, top, left;
		PhotoTopo topo = phototopo;
		double labelWidth = topo.getOptions().labelSize;
		if (label == null)
			return;

		width = (labelWidth) / 2;
		
		//if (!topo.isEditable())
		//	label.glow("#ffffff", 2);
		
		if (prevPath!=null)
		{
			// if we are not the first point, dont do any of this 
			if (label != null)
			{
				label.attr("cx", x).attr("cy", y);
				labelText.attr("x", x).attr("y", y);
				
				label.toFront();
				labelText.toFront();
			}
			return;
		}
		

		offsetX = this.pointGroup.getSplitOffset(this) * labelWidth;
		// find out which compas direction the route is heading in
		if (this.nextPoint != null)
		{
			double dy = this.nextPoint.y - this.y;
			double dx = this.nextPoint.x - this.x;
			double adx = Math.abs(dx);
			double ady = Math.abs(dy);

			if (adx < ady)
			{
				// top
				offsetY = width * 1.2;
				// bottom
				if (dy > 0)
				{
					offsetX = -offsetX;
					offsetY = -offsetY;
				}
			}
			else
			{

				// left
				offsetY = offsetX;
				offsetX = -width * 1.2;
				// right
				if (dx < 0)
				{
					offsetY = -offsetY;
					offsetX = -offsetX;
				}
			}
		}
		else
		{
			// no second point so position under
			offsetY = width * 2;
			offsetX = -offsetX;
		}

		left = this.x - width + offsetX;
		top = this.y - width + offsetY;

		left = Math.round(left);
		top = Math.round(top);

		if (top < 0)
		{
			top = 0;
		}
		if (left < 0)
		{
			left = 0;
		}
		if (top > topo.getOptions().height - labelWidth)
		{
			top = topo.getOptions().height - labelWidth;
		}
		if (left > topo.getOptions().width - labelWidth)
		{
			left = topo.getOptions().width - labelWidth;
		}

		// label.attr({x:left, y:top});
		label.attr("cx", left + width).attr("cy", top + width);

		left = left + width;
		top = top + width;
		this.labelText.attr("x", left).attr("y", top);

		// if (label.glowEl)
		// label.glowEl.remove();



	};

	/**
	 * @private
	 */
	void setStyle()
	{

		// var node = this.route ? this.route : this.polygon ? this : this.area;

		// var styles = node.phototopo.styles;
		if (this.circle != null)
		{
			// if the active point
			if (this == phototopo.getSelectedPoint())
			{
				this.circle.attr(Styles.handleSelectedActive());
				/*
				 * this.circle.attr(styles.handleSelected);
				 * 
				 * this.circle.animate(styles.handleSelectedActive, 500,
				 * function(){ this.animate(styles.handleSelected, 500,
				 * function(){ point.setStyle(); }); });
				 */
			}
			else if (route == phototopo.selectedRoute)
			{
				// if any point on the selected route
				this.circle.animate(Styles.handleSelected(), 100);
			}
			else
			{
				// if any other point on another route
				this.circle.animate(Styles.handle(),
						100);
				// if (route.autoColor != null)
				// {
				// this.circle.animate({'fill': node.autoColor}, 100);
				// }
			}
		}
	};

	void select()
	{
		select(false);
	}

	/**
	 * @private select the active point. new points on the route are added after
	 *          this point also explicitly selects the route the point is on
	 */
	void select(boolean dontSelectRoute)
	{

		// if (phototopo.selectedPoint === this) return;

		RoutePoint previous = phototopo.getSelectedPoint();

		phototopo.setSelectedPoint(this);
		if (!dontSelectRoute)
		{
			this.route.select(this);
		}
		if (previous != null)
		{
			previous.setStyle();
		}

		this.setStyle();
		
//		if (!dontSelectRoute && circle != null)
//		{
//			PointPopover pp = new PointPopover(this);
//			pp.showRelativeTo(circle);
//		}
	};

	/**
	 * @private attempts to move the Point to a new location - it may not move
	 *          due to 'stickyness' to itself and other points
	 */
	RoutePoint moveTo(double x, double y)
	{

		if (this.x == x && this.y == y)
		{
			return this;
		}
		// if (isNaN(x) || isNaN(y) ){
		// return { x: this.x, y: this.y };
		// }

		this.pointGroup.remove(this);
		this.pointGroup.redraw(null);

		this.x = x;
		this.y = y;

		this.pointGroup = phototopo.getPointGroup(this);

		// retrive the x and y from the point group which might not be what we
		// specified
		//this.x = this.pointGroup.x;
		//this.y = this.pointGroup.y;

		this.pointGroup.redraw(null);
		
		if (this.nextPoint != null)
		{
			this.nextPoint.pointGroup.redraw(null);
		}
		if (this.prevPoint != null)
		{
			this.prevPoint.pointGroup.redraw(null);
		}

		if (this.labelElement != null)
		{
			this.updateLabelPosition();
		}
		if (this.prevPoint != null && this.prevPoint.prevPoint == null)
		{
			this.prevPoint.updateLabelPosition();
		}

		this.updateIconPosition();

		this.route.saveData();

		// return { x: this.x, y: this.y };
		return this;

	}

	public void bringCircleAndIconToFront()
	{
		Console.log("bringCircleAndIconToFront " + this);
		
		if (iconElement != null)
			iconElement.toFront();
		
		if (circle != null)
			circle.toFront();
		
		if (labelElement != null)
			labelElement.toFront();
		
		if (labelText != null)
			labelText.toFront();
	}



	String getType()
	{
		return type;
	};

}
