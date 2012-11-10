package com.thesarvo.xphone.client.mobilewebkit.touchscroll;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.Element;
import com.google.gwt.user.client.DOM;

public class TouchScroll
{
	public Config config = new Config();
	
	
	Element scrollbarsTemplate = DOM.createDiv();

	Element container;
	
	Element outer = null;
	Element inner = null;
	Element e = null;
	Element f = null;
	
	boolean elastic = true;
	
	
	public TouchScroll(Element scrollElement)
	{
		scrollbarsTemplate.setInnerHTML("<div class='touchScrollTrack touchScrollTrackX'><div class='touchScrollHandle'></div></div><div class='touchScrollTrack touchScrollTrackY'><div class='touchScrollHandle'></div></div>");
		
		this.container = scrollElement;
		
		//document.addEventListener(events.move, TouchScroll, false);
		//document.addEventListener(events.end, TouchScroll, false);
		//document.addEventListener(events.cancel, TouchScroll, false);
	}
	
	
	public static native JavaScriptObject getMatrixFromNode(Object node) /*-{
		var doc = node.ownerDocument,
			transform = window.getComputedStyle(node).webkitTransform;

		return new WebKitCSSMatrix(transform);
	}-*/;
	
	
	//
	// UTILITY FUNCTIONS
	//
	protected static native void setTransitionProperty(/*HTMLElement*/ Object node) /*-{
		node.style.webkitTransformStyle = "preserve-3d";
		node.style.webkitTransitionProperty = "-webkit-transform";
	}-*/;

	protected static native void applyMatrixToNode(/*HTMLElement*/ Object node,
	                           /*WebKitCSSMatrix*/ Object matrix,
	                           /*String?*/ Object duration,
	                           /*String?*/ Object timingFunc) /*-{
		var s = node.style;
		if(duration != null){
			s.webkitTransitionDuration = duration + "";
		}
		if(timingFunc != null){
			s.webkitTransitionTimingFunction = timingFunc + "";
		}

		// This is twice as fast as than directly assigning the matrix
		// to the style property (maybe because no function call is involved?).
		node.style.webkitTransform = "translate(" + matrix.e + "px, " + matrix.f + "px)";
	}-*/;

	protected static native JavaScriptObject getMatrixFromEvent(Object event) /*-{ 
		if(event.touches && event.touches.length){
			event = event.touches[0];
		}

		var matrix = new WebKitCSSMatrix;
		matrix.e = event.pageX;
		matrix.f = event.pageY;

		return matrix;
	}-*/;

	protected static native JavaScriptObject roundMatrix(/*WebKitCSSMatrix*/ Object matrix) /*-{ 
		matrix.e = Math.round(matrix.e);
		matrix.f = Math.round(matrix.f);
		return matrix;
	}-*/;
	
//	// A DOM node to clone for scrollbars
//	var scrollbarsTemplate = document.createElement("div");
//	scrollbarsTemplate.innerHTML = [
//		'<div class="touchScrollTrack touchScrollTrackX">',
//			'<div class="touchScrollHandle"></div>',
//		'</div>',
//		'<div class="touchScrollTrack touchScrollTrackY">',
//			'<div class="touchScrollHandle"></div>',
//		'</div>'
//	].join("");
	
	
	
	
	
	
	
	public static class Config 
	{
		// the minimum move distance to trigger scrolling (in pixels)
		public int threshold = 5;

		// minimum scroll handle size
		public int scrollHandleMinSize = 25;
	
		public Flicking flicking = new Flicking();
		public Elasticity elasticity = new Elasticity();
		public SnapBack snapBack = new SnapBack();
	}
	
	public static class Flicking 
	{
		// longest duration between last touchmove and the touchend event to trigger flicking
		public int triggerThreshold = 150;

		// the friction factor (per milisecond).
		// This factor is used to precalculate the flick length. Lower numbers
		// make flicks decelerate earlier.
		public double friction = 0.998;

		// minimum speed needed before the animation stop (px/ms)
		// This value is used to precalculate the flick length. Larger numbers
		// lead to shorter flicking lengths and durations
		public double minSpeed = 0.15;

		// the timing function for flicking animinations (control points for a cubic bezier curve)
		public double[] timingFunc = new double[] {0, 0.3, 0.6, 1};
	}
	
	public static class Elasticity
	{
		// factor for the bounce length while dragging
		public double factorDrag= 0.5;

		// factor for the bounce length while flicking
		public double factorFlick= 0.2;

		// maximum bounce (in px) when flicking
		int max= 100;
	}

	// snap back configuration
	public static class SnapBack
	{
		// the timing function for snap back animations (control points for a cubic bezier curve)
		// when bouncing out before, the first control point is overwritten to achieve a smooth
		// transition between bounce and snapback.
		public double[] timingFunc = new double[] {0.4, 0, 1, 1};

		// default snap back time
		public double defaultTime= 250;

		// whether the snap back effect always uses the default time or
		// uses the bounce out time.
		public boolean alwaysDefaultTime= true;
	}
	
}
