package com.thesarvo.guide.client.phototopo;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gwt.core.client.Scheduler;
import com.google.gwt.core.client.Scheduler.ScheduledCommand;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.Style;
import com.google.gwt.dom.client.Style.Cursor;
import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.DragEndEvent;
import com.google.gwt.event.dom.client.DragEndHandler;
import com.google.gwt.event.dom.client.DragLeaveEvent;
import com.google.gwt.event.dom.client.DragLeaveHandler;
import com.google.gwt.event.dom.client.DragOverEvent;
import com.google.gwt.event.dom.client.DragOverHandler;
import com.google.gwt.event.dom.client.DragStartEvent;
import com.google.gwt.event.dom.client.DragStartHandler;
import com.google.gwt.event.dom.client.DropEvent;
import com.google.gwt.event.dom.client.DropHandler;
import com.google.gwt.event.dom.client.LoadEvent;
import com.google.gwt.event.dom.client.LoadHandler;
import com.google.gwt.event.dom.client.MouseDownEvent;
import com.google.gwt.event.dom.client.MouseDownHandler;
import com.google.gwt.event.dom.client.MouseMoveEvent;
import com.google.gwt.event.dom.client.MouseMoveHandler;
import com.google.gwt.event.dom.client.MouseOutEvent;
import com.google.gwt.event.dom.client.MouseOutHandler;
import com.google.gwt.event.dom.client.MouseUpEvent;
import com.google.gwt.event.dom.client.MouseUpHandler;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.FlexTable;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.FocusPanel;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.MouseListener;
import com.google.gwt.user.client.ui.UIObject;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.google.web.bindery.event.shared.EventBus;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.Attachment;
import com.thesarvo.guide.client.model.DrawingObject;
import com.thesarvo.guide.client.model.ImageNode;
import com.thesarvo.guide.client.model.PathDrawingObject;
import com.thesarvo.guide.client.model.RectDrawingObject;
import com.thesarvo.guide.client.raphael.ClickCallback;
import com.thesarvo.guide.client.raphael.MouseoverCallback;
import com.thesarvo.guide.client.raphael.Raphael;
import com.thesarvo.guide.client.raphael.Raphael.Circle;
import com.thesarvo.guide.client.raphael.Raphael.Image;
import com.thesarvo.guide.client.raphael.Raphael.Path;
import com.thesarvo.guide.client.raphael.Raphael.Rect;
import com.thesarvo.guide.client.raphael.Raphael.Text;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class PhotoTopo extends FlowPanel
{

	public static final int HANDLE_RADIUS = 5;
	
	private EventBus eventBus = null;
	private PhotoTopoOptions options = new PhotoTopoOptions();
	private boolean loading;
	private RoutePoint selectedPoint;
	//private Image background;
	private Map<String, PointGroup> pointGroups = new HashMap<String, PointGroup>();;
	private Map<String, Route> routes = new HashMap<String, Route>();
	
	private PhotoTopoCanvas canvas;
	private ImageNode imageNode;
	
	List<Attachment> attachments = new ArrayList<Attachment>();
	
	
	Legend legendDiv;
	
	
	String selectBlue = "#3D80DF";
	// var labelColor = "#ffee00";
	// var labelColor = "#ffffff";
	String labelColor = "#000000";

	Label hintLabel = null;
//	Rect layerShadows;
//	Rect layerAreas;
//	Rect layerRoutes;
//	Rect layerLabels;
//	Rect layerShadowsSel;
//	Rect layerAreasSel;
//	Rect layerRoutesSel;
//	Rect layerLabelsSel;
	double shownWidth;
	double shownHeight;
	double scale;
	Route selectedRoute;
	boolean routesVisible;
	boolean hide;
	private boolean errors;
	private PaletteView palette;
	private ToolType selectedTool = ToolType.select;

	private HorizontalPanel horizontalPanel;

	private FlowPanel canvasContainer;

	private LegendDragHandler legendDragHandler;

	private FocusPanel canvasFocusPanel;

	private com.google.gwt.user.client.ui.Image backgroundImage;
	
	int lastBackgroundX,lastBackgroundY;
	long lastBackgroundClick;

	private boolean routePopoverIsVisible = false;

	// var errors = false,
	// data,
	// pc, c,
	// label,
	// tempEl,
	// autoColor,
	// autoColorText,
	// autoColorBorder,
	// viewScale, parts, points;

	public PhotoTopo(ImageNode image, int width, int height)
	{
		this.imageNode = image;
		
		getOptions().width = width;
		getOptions().height = height;

		
		//this.add(canvas);
		//getElement().getStyle().setBorderWidth(1, Unit.PX);

	}

	public void init()
	{

		
			
		this.clear();
		this.routes.clear();
		this.pointGroups.clear();

		canvasFocusPanel = new FocusPanel();
		canvasContainer = new FlowPanel();
		canvasFocusPanel.add(canvasContainer);
		
		
		
		if (options.editable)
		{
			horizontalPanel = new HorizontalPanel();
			palette = new PaletteView(eventBus, this);
			horizontalPanel.add(palette);
			
			
			horizontalPanel.add(canvasFocusPanel);
			this.add(horizontalPanel);
			this.hintLabel = palette.status;
			//hp.setCellWidth(pv, width)
		}
		else
			this.add(canvasFocusPanel);
		
		if (palette != null)
			palette.showImagePropertiesStack();
		
		setBackgroundImage(imageNode.getUrl());
		
	}
	
	/**
	 * Set the photo image and triggers a redraw
	 * 
	 * @param {String} imageUrl a url to an image
	 */
	void setBackgroundImage(String imageUrl)
	{

		canvasContainer.getElement().getStyle().setPosition(Position.RELATIVE);
		
		if (backgroundImage !=null)
			backgroundImage.removeFromParent();
		
		
		backgroundImage = new com.google.gwt.user.client.ui.Image(imageUrl);
		String width = imageNode.getWidth();
		String height = imageNode.getHeight();
		if (StringUtil.isNotEmpty(width))
		{
			backgroundImage.setWidth(width);
			backgroundImage.getElement().setAttribute("width", width);
			
			if (StringUtil.isEmpty(height))
				height = "auto";
			
			backgroundImage.getElement().setAttribute("height", height);
			backgroundImage.getElement().getStyle().setProperty("height", height);
			backgroundImage.getElement().getStyle().setProperty("width", width + "px");
		}
		canvasContainer.add(backgroundImage);
		

		this.setLoading(true);
		
		backgroundImage.addLoadHandler(new LoadHandler()
		{
			
			@Override
			public void onLoad(LoadEvent event)
			{
				getOptions().width = backgroundImage.getWidth();
				shownWidth = backgroundImage.getWidth();
						
				getOptions().height = backgroundImage.getHeight();
				shownHeight = backgroundImage.getHeight();
				
				getImage().setHeight(""+shownHeight);
				
				setupCanvas();
				
				updateLegend();
			}
		});
		
//		backgroundImage.addClickHandler(new ClickHandler()
//		{
//			
//			@Override
//			public void onClick(ClickEvent event)
//			{
//				clickBackground(event.getX(), event.getY());
//				
//			}
//		});
		
		this.canvasFocusPanel.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				clickBackground(event.getX(), event.getY());
				
			}
		});
		
//		PhotoTopo phototopo = this;
//
//		PhotoTopoOptions options = phototopo.getOptions();
//
//		// img = new Image();
//
//		// Set these first so we have a workable size before the image gets
//		// loaded asynchronously
//		this.shownWidth = this.getOptions().width;
//		this.shownHeight = this.getOptions().height;
//
//		//options.imageUrl = imageUrl;
//
//		if (options.autoSize)
//		{
//			/*
//			 * FIXME - autosize $(img).load(function(){ options.origWidth =
//			 * img.width; options.origHeight = img.height;
//			 * 
//			 * phototopo.shownWidth = img.width; phototopo.shownHeight =
//			 * img.height; if (phototopo.shownHeight > options.height){
//			 * phototopo.scale = options.height / phototopo.shownHeight;
//			 * phototopo.shownHeight *= phototopo.scale; phototopo.shownWidth *=
//			 * phototopo.scale; } if (phototopo.shownWidth > options.width){
//			 * phototopo.scale = phototopo.scale * options.width /
//			 * phototopo.shownWidth; phototopo.shownHeight = options.origHeight
//			 * * phototopo.scale; phototopo.shownWidth = options.origWidth *
//			 * phototopo.scale; }
//			 * 
//			 * 
//			 * options.imageUrl = imageUrl; if (phototopo.bg){
//			 * phototopo.bg.remove(); } phototopo.bg =
//			 * phototopo.canvas.image(options.imageUrl, 0, 0,
//			 * phototopo.shownWidth, phototopo.shownHeight);
//			 * phototopo.bg.click(function(event){
//			 * phototopo.clickBackground(event); });
//			 * 
//			 * phototopo.bg.toBack(); }) .attr("src", imageUrl);
//			 */
//		}
//		else
//		{
//
//			if (phototopo.getBackground() != null)
//			{
//				phototopo.getBackground().remove();
//			}
//			background = phototopo.image(imageUrl, 0, 0,
//					phototopo.shownWidth, phototopo.shownHeight);
//
//			background.click(new ClickCallback()
//			{
//				
//				@Override
//				public void onClick(Event e)
//				{
//					
//					clickBackground(e);
//				}
//			});
//			
//
//			phototopo.getBackground().toBack();
//		}

	};


	public void setupCanvas()
	{
		if (canvas != null)
			canvas.clear();
		int width = (int) getOptions().width;
		int height = (int) getOptions().height;
		canvas = new PhotoTopoCanvas(width, height);
		
		canvas.getElement().getStyle().setTop(0, Unit.PX);
		canvas.getElement().getStyle().setLeft(0, Unit.PX);
		canvas.getElement().getStyle().setPosition(Position.ABSOLUTE);
		canvas.getElement().getStyle().setZIndex(1);
		if (backgroundImage != null)
		{
			backgroundImage.getElement().getStyle().setZIndex(0);
			//backgroundImage.setVisible(false);
		}
		canvasContainer.add(canvas);
		
		
//		Rect clickRect = (Rect) canvas.rect(0, 0, width, height).attr("fill","none").attr("stroke","none");
//		clickRect.toBack();
//		clickRect.click(new ClickCallback()
//		{
//			
//			@Override
//			public void onClick(Event event)
//			{
//				
//				Element target = event.getCurrentTarget();
//				int clientX = event.getClientX();
//				int clientY = event.getClientY();
//				
//				int relX = clientX - target.getAbsoluteLeft() + target.getScrollLeft() +
//					      target.getOwnerDocument().getScrollLeft();		
//				
//				int relY = clientY - target.getAbsoluteTop() + target.getScrollTop() +
//				target.getOwnerDocument().getScrollTop();
//
//				
//				clickBackground(relX, relY);
//			}
//		});
		
		
		
		
		// size of visible image
		this.shownWidth = -1;
		this.shownHeight = -1;
		this.scale = 1;

		this.selectedRoute = null;
		this.setSelectedPoint(null);
		this.routesVisible = true;

		// colour the background
		//this.setBackgroundImage(imageNode.getUrl());

		// Now draw the routes
		
		double viewScale = this.getOptions().viewScale;

		setupDrawingObjects();
		

		this.redraw();
		

		this.updateHint();


		
		this.setLoading(false);
	}

	public void setupDrawingObjects()
	{
		for (DrawingObject data : imageNode.getDrawingObjects())
		{
			Route route = null;
			if (this.getRoutes().get(data.getId()) != null)
			{
				Console.log("Error: duplicate route=[" + data.getId() + "] "+ this.getOptions().elementId);
			}
		
			if (data.getType().equals("rect") )
			{
				RectDrawingObject rdo = (RectDrawingObject) data;
				RectWithText rwt = new RectWithText(this, rdo );
				rwt.init();
			}
			else if (data.getType().equals("path") )
			{
				addNewPathDrawingObject(data);
			}

				

		}
	}

	public void addNewPathDrawingObject(DrawingObject data)
	{
		Route route;
		route = new Route(this, data.getId(), (PathDrawingObject) data);
		this.getRoutes().put(data.getId(), route);
		// this.routes[data.id].orig = data;
		
		route.init();
	}

	public Rect rect(int x, int y, int w, int h)
	{
		return canvas.rect(x, y, w, h);
	}

	/**
	 * @private
	 */
	void missingError(boolean exp, String text)
	{
		if (!exp)
		{
			errors = true;
			throw new RuntimeException("PhotoTopo config error: " + text);
		}
	}

	public Circle circle(double x, double y, int r)
	{
		return canvas.circle(x, y, r);
	}

	public Raphael.Path path(String p)
	{
		return canvas.path(p);
	}

	public Image image(String src, double x, double y, double width,
			double height)
	{
		return canvas.image(src, x, y, width, height);
	}

	public Text text(double x, double y, String text)
	{
		return canvas.text(x, y, text);
	}

	/**
	 * Sets wether the route lines are visible
	 * 
	 * @param {Boolean} visible if true makes the routes visible
	 */
	void setRouteVisibility(boolean visible)
	{

		routesVisible = visible;
		// if (!this.hide){
		// phototopo.hide = phototopo.bg.clone();
		// phototopo.hide.attr("opacity", 0.8);
		// }
		// if (visible){
		// phototopo.hide.toBack();
		// } else {
		// phototopo.hide.toFront();
		// }
	};

	/**
	 * @private
	 */
	void updateHint()
	{
		if (!this.getOptions().editable)
		{
			return;
		}

		if (this.selectedRoute == null)
		{
			this.setHint("Select the route you wish to draw or edit in the table below");
		}
		else if (this.selectedRoute.getPoints() != null
				&& this.selectedRoute.getPoints().size() == 0)
		{
			this.setHint("Click at the beginning of the route to start drawing this route");
		}
//		else if (this.selectedRoute.getVertices() != null
//				&& this.selectedRoute.getVertices().size() == 0)
//		{
//			this.setHint("Click anywhere to start drawing the area shape");
//		}
		else
		{
			this.setHint("Click to add or select, then drag to move. Double click to remove");
		}

	};

	/**
	 * @private
	 */
	/*
	 * PhotoTopo.prototype.setHint = function(hintHTML){ if (!this.hintEl){
	 * this.hintEl = $("<div></div>").show("slide").appendTo(this.photoEl)[0]; }
	 * this.hintEl.innerHTML = "<strong class="label
	 * label-info">Help</strong> "+hintHTML; $(this.hintEl).offset(0,0); };
	 */

	void setHint(String hint)
	{
		if (hintLabel != null)
			hintLabel.setText(hint);
	}

	/**
	 * Selects the route with a given id
	 * 
	 * @param {Route} route the route to select
	 * @param {Boolean} [toggle] if true and the route is already selected will
	 *        deselect
	 */
	Route selectRoute(String routeId, boolean toggle)
	{

		// can also be called staticly
		// in this case iterate through all topos and select in them all
		// var master = this;

		Route r = this.getRoutes().get(routeId);
		if (r != null)
		{
			if (toggle && r == this.selectedRoute)
			{
				this.selectedRoute.deselect();
			}
			else
			{
				r.select(null);
				return r;
			}
		}
		else
		{
			if (this.selectedRoute != null)
			{
				this.selectedRoute.deselect();
			}
		}
		return null;
	};



	/**
	 * @private
	 */
	public void redraw()
	{

		for (Route route : this.getRoutes().values())
		{
			final Route r = route;
			
			// do the redraws on the UI loop so as to not block the drawing of the UI incrementally on slow devices
			Scheduler.get().scheduleDeferred(new ScheduledCommand()
			{
				public void execute()
				{
					r.redraw();

					// dirty hack? should be inside the route object
					if (r.getPoints() != null && r.getPoints().size() > 0)
					{
						//r.select(null); // select them all to flush the outline z-index
						r.getPoints().get(0).updateLabelPosition();
					}
					
				}
			});

		}
		
		for (final Route route : this.getRoutes().values())
		{
			Scheduler.get().scheduleDeferred(new ScheduledCommand()
			{
				public void execute()
				{
					route.bringLabelAndPointsToFront();
				}
			});

		}
		/*
		Scheduler.get().scheduleDeferred(new ScheduledCommand()
		{
			public void execute()
			{
				selectRoute(null, false); // select nothing
			}
		});
		*/
		
	};

	/**
	 * @private creates or retreives a point group for a new point location if
	 *          the point is close to another point it will "stick" the point to
	 *          the previous point
	 */
	PointGroup getPointGroup(RoutePoint point)
	{

		double x = point.x, y = point.y;
		String key;
		PointGroup group;

		x = Math.round(x);
		y = Math.round(y);

		// make sures it"s inside the picture
		if (x < 0)
		{
			x = 0;
		}
		if (y < 0)
		{
			y = 0;
		}
//		if (x > this.shownWidth)
//		{
//			x = this.shownWidth;
//		}
//		if (y > this.shownHeight)
//		{
//			y = this.shownHeight;
//		}

		key = this.getKey(point);
		group = this.getNearGroup(point);

		point.x = x;
		point.y = y;

		if (group != null)
		{
			group.add(point);
		}
		else
		{
			group = new PointGroup(point);
			this.getPointGroups().put(key, group);
		}

		return group;

	};

	PointGroup getNearGroup(RoutePoint point)
	{
		// wow, this is a bit nuts. Surely easier to iterate through all the
		// point groups and calc a distance?
		double threshold = this.getOptions().thickness * 4;
		String key = this.getKey(point);
		PointGroup group = this.getPointGroups().get(key);
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x + threshold, point.y));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x - threshold, point.y));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x, point.y + threshold));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x, point.y - threshold));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x - threshold, point.y
					+ threshold));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x - threshold, point.y
					- threshold));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x + threshold, point.y
					+ threshold));
			group = this.getPointGroups().get(key);
		}
		if (group == null)
		{
			key = this.getKey(new RoutePoint(point.x + threshold, point.y
					- threshold));
			group = this.getPointGroups().get(key);
		}
		return group;
	};

	/**
	 * @private given an x,y coord return a key for saving this
	 */
	String getKey(RoutePoint point)
	{
		double threshhold = this.getOptions().thickness * 2, 
				tx = point.x - point.x
				% threshhold + threshhold / 2, 
				ty = point.y - point.y
				% threshhold + threshhold / 2;
		return "" + tx + "_" + ty;
	};

//	/**
//	 * @private Adds or inserts a new Point into a route
//	 */
//	void addToRoute(String routeId, double x, double y, String type,
//			Integer position)
//	{
//		Route r = this.getRoutes().get(routeId);
//		if (r != null)
//		{
//			r.addPoint(x, y, type, position);
//		}
//	};

	public void setNewImageSrc(String val)
	{
		imageNode.setSrc(val);
		imageNode.setHeight("auto");
		setBackgroundImage(imageNode.getUrl());
		
	}
	

	/**
	 * @private handle a click on the background if in edit mode and a point is
	 *          selected then insert it
	 */
	void clickBackground(int relX, int relY)
	{
		
		long now = System.currentTimeMillis();
		Console.log("clickBackground x=" + relX + "," + relY + " now=" + now);

		if (relX == lastBackgroundX && relY == lastBackgroundY && now-lastBackgroundClick < 2000)
		{
			Console.log("Ignoring duplicate click");
			return;
		}
		lastBackgroundX = relX;
		lastBackgroundY = relY;
		lastBackgroundClick = now;
		
		if (this.getOptions().editable)
		{
			if (selectedTool == ToolType.text)
			{
				// new text tool
				RectDrawingObject rdo = imageNode.newRect();
				rdo.setX(relX);
				rdo.setY(relY);
				rdo.setWidth(60);
				rdo.setHeight(20);
				rdo.setStyle(RectStyle.black_text_on_solid_white);
				rdo.setText("Write some text");
				RectWithText text = new RectWithText(this, rdo);
			
				text.init();
				
				palette.setSelectedRect(text);
			}
			else if (selectedTool == ToolType.rect)
			{
				RectDrawingObject rdo = imageNode.newRect();
				rdo.setX(relX);
				rdo.setY(relY);
				rdo.setWidth(100);
				rdo.setHeight(80);
				rdo.setStyle(RectStyle.yellow_outline);
				rdo.setText("Write some text");
				
				RectWithText rect = new RectWithText(this, rdo);
				
				rect.init();
				
				palette.setSelectedRect(rect);
				
			}
			else if (this.selectedRoute != null)
			{
				
				this.selectedRoute.addAfter(this.getSelectedPoint(), relX, relY, "");
			}
			else if (selectedTool == ToolType.curve)
			{
				PathDrawingObject pdo = imageNode.newPath();
				String points = relX + "," + relY;
				pdo.setPoints(points);
				addNewPathDrawingObject(pdo);
				selectRoute(pdo.getId(), false);
				
			}
			else
			{
				this.setHint("First select a route or point to add to it");
			}
		}




	};



	public void addClass(String clz)
	{
		this.getElement().addClassName(clz);
		
	};
	
	public void removeClass(String clz)
	{
		this.getElement().removeClassName(clz);
		
	}

	public RoutePoint getSelectedPoint()
	{
		return selectedPoint;
	}

	public void setSelectedPoint(RoutePoint selectedPoint)
	{
		this.selectedPoint = selectedPoint;
		
		if (palette != null && selectedPoint != null)
			palette.setSelectedPoint(selectedPoint);
	
		
		if (selectedPoint != null)
			selectedTool = ToolType.curve;
		
	}



	public Map<String, PointGroup> getPointGroups()
	{
		return pointGroups;
	}

	public void setPointGroups(Map<String, PointGroup> pointGroups)
	{
		this.pointGroups = pointGroups;
	}

	public Map<String, Route> getRoutes()
	{
		return routes;
	}

	public void setRoutes(Map<String, Route> routes)
	{
		this.routes = routes;
	}



	public boolean isLoading()
	{
		return loading;
	}

	public void setLoading(boolean loading)
	{
		this.loading = loading;
	}

	public PhotoTopoOptions getOptions()
	{
		return options;
	}

	public void setOptions(PhotoTopoOptions options)
	{
		this.options = options;
	}

	EventBus getEventBus()
	{
		return eventBus;
	}

	void setEventBus(EventBus eventBus)
	{
		this.eventBus = eventBus;
	}

	/**
	 * @return the selectedTool
	 */
	public ToolType getSelectedTool()
	{
		return selectedTool;
	}

	/**
	 * @param selectedTool the selectedTool to set
	 */
	public void setSelectedTool(ToolType selectedTool)
	{
		this.selectedTool = selectedTool;
		
		selectRoute("", false);
		
	}

	public void routeClicked(Route route, Event e, UIObject source)
	{
		if (isEditable())
		{
			selectedRoute = route;
			
			String id = route == null ? null : route.getId();
			selectRoute(id, true);
			palette.setSelectedRoute(route);
		}
		else
		{

			if (StringUtil.isNotEmpty( route.getData().getLinkedTo()) )
			{
				selectRoute(route.getId(),false);
				
				RoutePopover rp = new RoutePopover( route.getData().getLinkedTo(), this);
				
				if (source != null)
					rp.showRelativeTo(source);
				else
					rp.show();
			}
			
		}
		
	}

	public void setSelectedRectWithText(RectWithText rectWithText)
	{
		if (palette != null)
			palette.setSelectedRect(rectWithText);
		
	};
	
	public String getSvg()
	{
		return canvas.getSvg();
	}

	/**
	 * @return the image
	 */
	public ImageNode getImage()
	{
		return imageNode;
	}

	/**
	 * @param image the image to set
	 */
	public void setImageNode(ImageNode image)
	{
		this.imageNode = image;
	}

	public List<Attachment> getAttachments()
	{
		return attachments;
	}

	public void setAttachments(List<Attachment> attachments)
	{
		this.attachments = attachments;
	}

	public void updateLegend()
	{
		setupLegend();
		
	}

	
	/**
	 * Sets the order of the routes which affects the way they visually thread
	 * through each point
	 * 
	 * @param order
	 *            a hash of the id to the order
	 */
	/*
	 * void setOrder = function(order){
	 * 
	 * // reorder all the routes var id, label; for(id in order){ if
	 * (this.routes[id]){ this.routes[id].order = order[id]; if
	 * (this.options.getlabel){ label = this.options.getlabel(this.routes[id]);
	 * this.routes[id].setLabel(label); } } }
	 * 
	 * // refresh the render for(id in this.pointGroups){
	 * this.pointGroups[id].sort(); this.pointGroups[id].redraw(); }
	 * 
	 * this.saveData(); };
	 */
	
	private void setupLegend()
	{

		if (legendDiv != null)
		{
			legendDiv.removeFromParent();
			legendDiv = null;
		}

		Boolean legend = imageNode.getLegend();
		if (legend)
		{
			legendDiv = new Legend(this);
			

			canvasContainer.add(legendDiv);
			canvasContainer.getElement().getStyle().setPosition(Position.RELATIVE);

			legendDiv.init();

			if (getOptions().editable)
			{
				if (legendDragHandler == null)
					legendDragHandler = new LegendDragHandler();
//				legendDiv.addDragStartHandler(handler);
//				legendDiv.addDragEndHandler(handler);
				
				legendDiv.addMouseDownHandler(legendDragHandler);
				
				canvasFocusPanel.addMouseMoveHandler(legendDragHandler);			
				canvasFocusPanel.addMouseUpHandler(legendDragHandler);
				canvasFocusPanel.addMouseOutHandler(legendDragHandler);
				
				legendDiv.getElement().getStyle().setCursor(Cursor.MOVE);
			}
			
			
		}
	}


	
	private final class LegendDragHandler implements MouseMoveHandler, MouseUpHandler, MouseDownHandler, MouseOutHandler
	{
		int ox = 0;
		int oy = 0;
		int dx = 0;
		int dy = 0;
		int ix,iy;
		boolean down = false;
		



		@Override
		public void onMouseMove(MouseMoveEvent event)
		{
			
//			dx = event.getX() - ox;
//			dy = event.getY() - oy;
//			
//			Console.log("onMouseMove " + event.getX() + "," + event.getY());
			
			if (down)
			{
				Console.log("Mouse move when down");
				dx = event.getClientX() - ox;
				dy = event.getClientY() - oy;
				
				imageNode.setLegendX( ix + dx);
				imageNode.setLegendY( iy + dy);
				
				legendDiv.getElement().getStyle().setLeft(ix + dx, Unit.PX);
				legendDiv.getElement().getStyle().setTop(iy + dy, Unit.PX);
			}
		}



		@Override
		public void onMouseUp(MouseUpEvent event)
		{
			Console.log("Mouse up");
			
			if (down)
			{
				updateLegend();
				palette.showLegendPropertiesStack();
			}
			down = false;
		}



		@Override
		public void onMouseDown(MouseDownEvent event)
		{
			Console.log("Mouse down");
			down = true;
			ox = event.getClientX();
			oy = event.getClientY();
			Integer cx = imageNode.getLegendX();
			Integer cy = imageNode.getLegendY();
			if (cx==null)
				cx = 0;
			if (cy == null)
				cy = 0;
			
			ix = cx;
			iy = cy;
		}



		@Override
		public void onMouseOut(MouseOutEvent event)
		{
			Console.log("Mouse out");
			
			if (down)
				updateLegend();
			
			down = false;
			
		}
	}


	public void setImageWidth(String val)
	{
		getImage().setWidth(val);
		getImage().setHeight("auto");
		setBackgroundImage(imageNode.getUrl());
	}

	public void routeMouseOver(Route route)
	{
		if (legendDiv != null)
		{
			// Console.log("routeMouseOver phototopo.RoutePopoverVisible");
			// Console.log(String.valueOf(this.RoutePopoverIsVisible));

			if (this.isRoutePopoverIsVisible())
			{
				// don't change any highlights
			}
			else
			{
				// route == null --> "curve onMouseOut"
				// route != null --> "curve onMouseOver"
				if (route != null)
				{
					legendDiv.highlightId(route.getData().getLinkedTo());
				}
				else
				{
					legendDiv.clearHighlight();
				}
			}
		}
	}

	public void routePopoverClosed()
	{
		this.setRoutePopoverIsVisible(false);
		Console.log("routePopoverClosed phototopo.RoutePopoverVisible");
		Console.log(String.valueOf(this.isRoutePopoverIsVisible()));
		this.deselectAll();
		this.legendDiv.clearHighlight();
	}

	public boolean isEditable()
	{
		return getOptions().editable;
	}

	public void selectClimbId(String id)
	{
		if (StringUtil.isEmpty(id))
			return;
		
		for (Route r : routes.values())
		{
			if (id.equals(r.getData().getLinkedTo()))
				selectRoute(r.getId(), false);
		}
		
	}

	public void deselectAll()
	{
		for (Route r : routes.values())
		{
			r.deselect();
		}
	}

	protected boolean isRoutePopoverIsVisible()
	{
		return routePopoverIsVisible;
	}

	protected void setRoutePopoverIsVisible(boolean routePopoverIsVisible)
	{
		this.routePopoverIsVisible = routePopoverIsVisible;
	}

	void addPathEventHandlers(
			final Path curve, final Route route)
	{
		curve.click(new ClickCallback()
		{
			
			@Override
			public void onClick(Event e)
			{
				Console.log("curve onclick");
				route.onClick(e, curve);
				if (e!=null)
					e.stopPropagation();
				
	
			}
		});
		curve.mouseover(new MouseoverCallback()
		{
			
			@Override
			public void onMouseOver()
			{
				Console.log("curve onMouseOver");
				routeMouseOver(route);
				
			}
			
			@Override
			public void onMouseOut()
			{
				Console.log("curve onMouseOut");
				routeMouseOver(null);
			}
		});
		
		
//		curve.addHandler(new MouseOverHandler()
//		{
//			
//			@Override
//			public void onMouseOver(MouseOverEvent event)
//			{
//				Console.log("curve onMouseOver");
//				phototopo.routeMouseOver(route);
//				
//			}
//		}, MouseOverEvent.getType());
	}

}
