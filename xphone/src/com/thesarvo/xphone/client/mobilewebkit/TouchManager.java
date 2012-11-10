package com.thesarvo.xphone.client.mobilewebkit;

import java.util.Date;

import com.google.gwt.core.client.JsArray;
import com.google.gwt.dom.client.NativeEvent;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.EventHelper;
import com.google.gwt.event.dom.client.HasClickHandlers;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.event.shared.HandlerManager;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.user.client.ui.WidgetHelper;
import com.thesarvo.xphone.client.util.BrowserUtil;
import com.thesarvo.xphone.client.util.Logger;

/**
 * Tracks touch events to give fast clicks and gestures (eventually)
 * 
 * @author jnermut
 * 
 */
public class TouchManager implements HasTouchHandlers, TouchStartHandler,
		TouchMoveHandler, TouchEndHandler, HasClickHandlers
{
	Widget widget;
	boolean appliesActiveStyle = true;
	boolean firesClicks = false;

	// current touch state
	int startX = 0, startY = 0;
	long startTime = 0;
	int deltaX = 0, deltaY = 0;
	long deltaT = 0;
	boolean active = false;
	
	boolean touchInProgress = false;
	
	private HandlerManager handlerManager = null;
	
	AddActiveCommand addActiveCommand = null;
	Command removeActiveCommand = null;

	public TouchManager()
	{
	}
	
	public TouchManager(Widget w, boolean makeActive, boolean fireClicks)
	{
		this(w);

		this.appliesActiveStyle = makeActive;
		this.firesClicks = fireClicks;
	}

	public TouchManager(Widget w)
	{
		com.thesarvo.xphone.client.util.Logger.debug("Initialising TouchManager");
		
		setWidget(w);
	}

	@Override
	public void onTouchStart(TouchStartEvent event)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchStart()");

		//Window.alert("TouchManager.onTouchStart()");
		
		if (event != null)
		{
			startX = event.getNativeEvent().getClientX();
			startY = event.getNativeEvent().getClientY();
			startTime = new Date().getTime();
			deltaX = 0;
			deltaY = 0;
			deltaT = 0;
			touchInProgress = true;
			

			if (appliesActiveStyle && widget != null)
			{
				getAddActiveCommand().schedule(50);
			}
		}
	}

	
	

	
	@Override
	public void onTouchMove(TouchMoveEvent touchMoveEvent)
	{

		updateDeltas(touchMoveEvent);

		com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchMove() deltat=" + deltaT);

		
		// int absX = Math.abs(deltaX);
		//int absY = Math.abs(deltaY);

		// TODO: swipe detection

		if (appliesActiveStyle && widget != null && active && deltaX != 0 && deltaY != 0)
		{
			DeferredCommand.addCommand( getRemoveActiveCommand() );
		}

	}

	@Override
	public void onTouchEnd(TouchEndEvent touchEndEvent)
	{
		try
		{
			updateDeltas(touchEndEvent);
			
			com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchEnd()  deltat=" + deltaT);		

	
			if (noMove())
			{
				if (appliesActiveStyle && !active)
				{
					// timer command hasnt fired yet, so immediately set active
					addActiveStyle();
				}
				
				// this is a click
				if (firesClicks && widget != null)
				{
					com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchEnd firing click event");
	
					//Window.alert("gunna fire click");
					
					touchEndEvent.stopPropagation();
					touchEndEvent.preventDefault();
	
					//ClickEvent.fireNativeEvent(click, widget);
					if (handlerManager!=null)
					{
						NativeEvent nc = createClickEvent(touchEndEvent
								.getNativeEvent());
						ClickEvent click = EventHelper.createClickEvent();
						click.setNativeEvent(nc);
						handlerManager.fireEvent(click);
					}
				}
				else
					com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchEnd firesClicks=" + firesClicks);
			}
			else
				com.thesarvo.xphone.client.util.Logger.debug("TouchManager.onTouchEnd deltaY=" + deltaY);
		}
		finally 
		{
			if (appliesActiveStyle && active && widget != null)
			{
				DeferredCommand.addCommand( getRemoveActiveCommand() );				
			}
			
			startX=0;
			startY=0;
			startTime=0;
			deltaX = 0;
			deltaY = 0;
			deltaT = 0;
			active = false;
			touchInProgress = false;
		}
	}

	private boolean noMove()
	{
		return deltaX == 0 && deltaY == 0;
	}

	private void updateDeltas(TouchEvent event)
	{
		JsArray<Touch> touches = event.getTouches();
		if (touches.length() > 0)
		{
			Touch first = touches.get(0);
			deltaX = first.getPageX() - startX;
			deltaY = first.getPageY() - startY;
			deltaT = new Date().getTime() - startTime;
		}
//		else
//		{
//			deltaX = 0;
//			deltaY = 0;
//			deltaT = 0;
//		}
	}

	private static native NativeEvent createClickEvent(NativeEvent event) /*-{
		var clickEvent = $wnd.document.createEvent("MouseEvent");
		clickEvent.initMouseEvent(
			"click", //type
			true, //canBubble
			true, //cancelable
			event.view,
			1, //detail (number of clicks for mouse events)
			event.screenX,
			event.screenY,
			event.clientX,
			event.clientY,
			event.ctrlKey,
			event.altKey,
			event.shiftKey,
			event.metaKey,
			event.button,
			null// relatedTarget
		);
		return clickEvent;
	}-*/;

	@Override
	public HandlerRegistration addTouchStartHandler(TouchStartHandler handler)
	{
		if (TouchUtil.isTouchAvailable() && widget != null)
			return WidgetHelper.addDomHandler(widget, handler, TouchStartEvent
					.getType());
		else
		{
			Logger.debug("addTouchStartHandler not adding dom handler because touch not available");
			return null;
		}

	}

	@Override
	public HandlerRegistration addTouchCancelHandler(TouchCancelHandler handler)
	{
		if (TouchUtil.isTouchAvailable() && widget != null)
			return WidgetHelper.addDomHandler(widget, handler, TouchCancelEvent
					.getType());
		else
			return null;
	}

	@Override
	public HandlerRegistration addTouchEndHandler(TouchEndHandler handler)
	{
		if (TouchUtil.isTouchAvailable() && widget != null)
			return WidgetHelper.addDomHandler(widget, handler, TouchEndEvent
					.getType());
		else
			return null;
	}

	@Override
	public HandlerRegistration addTouchMoveHandler(TouchMoveHandler handler)
	{
		if (TouchUtil.isTouchAvailable() && widget != null)
			return WidgetHelper.addDomHandler(widget, handler, TouchMoveEvent
					.getType());
		else
			return null;
	}

	/**
	 * @return the firesClicks
	 */
	public boolean isFiresClicks()
	{
		return firesClicks;
	}

	/**
	 * @param firesClicks
	 *            the firesClicks to set
	 */
	public void setFiresClicks(boolean firesClicks)
	{
		this.firesClicks = firesClicks;
	}

	@Override
	public HandlerRegistration addClickHandler(ClickHandler handler)
	{
		firesClicks = true;
		
		if (BrowserUtil.isMobileBrowser() || Window.Navigator.getUserAgent().toLowerCase().contains("chrome"))
			return ensureHandlers().addHandler(ClickEvent.getType(), handler);
		else
			return WidgetHelper.addDomHandler(this.widget, handler, ClickEvent.getType());
			
	}

	@Override
	public void fireEvent(GwtEvent<?> event)
	{
		// TODO Auto-generated method stub
	}

	/**
	 * Ensures the existence of the handler manager.
	 * 
	 * @return the handler manager
	 * */
	HandlerManager ensureHandlers()
	{
		return handlerManager == null ? handlerManager = new HandlerManager(
				this) : handlerManager;
	}

	/**
	 * @return the appliesActiveStyle
	 */
	public boolean isAppliesActiveStyle()
	{
		return appliesActiveStyle;
	}

	/**
	 * @param appliesActiveStyle the appliesActiveStyle to set
	 */
	public void setAppliesActiveStyle(boolean appliesActiveStyle)
	{
		this.appliesActiveStyle = appliesActiveStyle;
	}

	/**
	 * @return the widget
	 */
	public Widget getWidget()
	{
		return widget;
	}

	/**
	 * @param widget the widget to set
	 */
	public void setWidget(Widget widget)
	{
		this.widget = widget;
	}

	public void initTouchTracking()
	{
		if (widget != null)
		{
			com.thesarvo.xphone.client.util.Logger.debug("TouchManager.initTouchTracking");
			
			//((HasTouchHandlers) w).addTouchStartHandler(this);
			//((HasTouchHandlers) w).addTouchMoveHandler(this);
			//((HasTouchHandlers) w).addTouchEndHandler(this);
			
			this.addTouchStartHandler(this);
			this.addTouchMoveHandler(this);
			this.addTouchEndHandler(this);
		}
	}

	/**
	 * @return the addActiveCommand
	 */
	public AddActiveCommand getAddActiveCommand()
	{
		if (addActiveCommand==null)
			addActiveCommand = new AddActiveCommand();
		
		return addActiveCommand;
	}

	/**
	 * @return the removeActiveCommand
	 */
	public Command getRemoveActiveCommand()
	{
		if (removeActiveCommand==null)
			removeActiveCommand = new RemoveActiveCommand();
		
		return removeActiveCommand;
	}
	
	protected void addActiveStyle()
	{
		if (deltaX == 0 && deltaY == 0 && !active && touchInProgress)
		{
			com.thesarvo.xphone.client.util.Logger.debug("adding active style");
			widget.addStyleName("active");
			active = true;
		}
	}

	protected void removeActiveStyle()
	{
		if ( widget!=null)
		{
			com.thesarvo.xphone.client.util.Logger.debug("removing active style");
			widget.removeStyleName("active");
			active = false;
		}
	}

	
	class AddActiveCommand extends Timer
	{
		@Override
		public void run()
		{
			com.thesarvo.xphone.client.util.Logger.debug("AddActiveCommand.run deltat=" + (new Date().getTime() - startTime) + ", active=" + active);
			
			addActiveStyle();	
		}
	}
	
	class RemoveActiveCommand implements Command
	{
		@Override
		public void execute()
		{
			removeActiveStyle();		
		}
	}
	

}
