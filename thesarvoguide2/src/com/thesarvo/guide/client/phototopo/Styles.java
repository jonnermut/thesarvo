package com.thesarvo.guide.client.phototopo;

import com.google.gwt.core.client.JavaScriptObject;
import com.thesarvo.guide.client.raphael.Attr;

public class Styles
{
	//public static Attr handle = new Attr().;

	public final static native JavaScriptObject areaBorder() /*-{
																return {
																'stroke': 'black',
																'stroke-width': 4, 
																'stroke-linejoin': 'miter',
																'stroke-linecap': 'round',
																}
																}-*/;

	public final static native JavaScriptObject areaBorderSelected() /*-{ 
																		return {
																		'stroke-width': 4, 
																		'stroke': 'white'
																		} }-*/;

	public final static native JavaScriptObject areaBorderVisible() /*-{ 
																	return {
																	'stroke-dasharray': '',
																	'stroke-opacity': 1
																	} }-*/;

	public final static native JavaScriptObject areaBorderHidden() /*-{ 
																	return {
																	'stroke-opacity': 0
																	} }-*/;

	public final static native JavaScriptObject areaBorderEditHidden() /*-{ 
																		return {
																		'stroke-dasharray': '..',
																		'stroke-opacity': .7
																		} }-*/;

	public final static native JavaScriptObject areaFill() /*-{ 
															return {
															'stroke': "white",
															'stroke-width': 2,
															'stroke-linejoin': 'miter',
															'stroke-linecap': 'round',
															'stroke-opacity': 1,
															'fill-opacity': .01,
															'fill': "#3D80DF"
															} }-*/;

	public final static native JavaScriptObject areaFillSelected() /*-{ 
																	return {
																	'stroke': selectBlue,
																	'fill-opacity': .2
																	} }-*/;

	public final static native JavaScriptObject areaFillVisible() /*-{ 
																	return {
																	'stroke-opacity': 1
																	} }-*/;

	public final static native JavaScriptObject areaFillHidden() /*-{ 
																	return {
																	'stroke-opacity': 0
																	} }-*/;

	public final static native JavaScriptObject areaFillEditHidden() /*-{ 
																		return {
																		'stroke-opacity': .3
																		} }-*/;

	public final static native JavaScriptObject areaLabelText() /*-{ 
																return {
																'fill': 'black',
																} }-*/;

	public final static native JavaScriptObject areaLabelTextSelected() /*-{ 
																		return {
																		'fill': 'white'
																		} }-*/;

	public final static native JavaScriptObject areaLabel() /*-{ 
															return {
															'fill': "white",
															'stroke': "white",
															'stroke-width': 2
															} }-*/;

	public final static native JavaScriptObject areaLabelSelected() /*-{ 
																	return {
																	'stroke': "#3D80DF",
																	'fill': "#3D80DF"
																	} }-*/;

	public final static native JavaScriptObject areaLabelShadow() /*-{ 
																	return {
																	'stroke-width': 4,
																	'stroke': 'black'
																	} }-*/;

	public final static native JavaScriptObject areaLabelShadowSelected() /*-{ 
																			return {
																			'stroke': 'white'
																			} }-*/;

	public final static native JavaScriptObject areaLabelLine() /*-{ 
																return {
																'stroke': 'white',
																'stroke-width': 2,
																'stroke-linejoin': 'miter',
																'stroke-linecap': 'round'
																} }-*/;

	public final static native JavaScriptObject areaLabelLineSelected() /*-{ 
																		return {
																		'stroke-width': 2,
																		'stroke': "#3D80DF",
																		'stroke-linejoin': 'miter',
																		'stroke-linecap': 'round'
																		} }-*/;

	public final static native JavaScriptObject outline() /*-{ 
															return {
															//'stroke': 'black', // default if it can't inherit from label colour
															'stroke': 'red',
															//'stroke-width': this.options.thickness * 1.7,
															'stroke-width':1,
															'stroke-linejoin': 'miter',
															'stroke-linecap': 'round',
															'stroke-opacity': 0.7 
															} }-*/;

	public final static native JavaScriptObject outlineSelected() /*-{ 
																	return {
																	'stroke': 'white' // default if it can't inherit from label colour
																	} }-*/;

	public final static native JavaScriptObject ghost(double thickness) /*-{ 
																		return {
																		'stroke': 'green',
																		'stroke-width': thickness * 4,
																		'stroke-linejoin': 'miter',
																		'stroke-linecap': 'round',
																		'stroke-opacity': 0.01 
																		} }-*/;

	public final static native JavaScriptObject stroke_dash(double thickness) /*-{ 
																			return {
																			'stroke': 'white',
																			'stroke-dasharray': '- ',
																			'stroke-width': thickness,
																			'stroke-linejoin': 'miter',
																			'stroke-linecap': 'round',
																			'stroke-opacity': 1 
																			} }-*/;

	public final static native JavaScriptObject stroke_dot(double thickness) /*-{ 
																			return {
																			'stroke': 'white',
																			'stroke-dasharray': '.',  // dots seem broken in raphael... TODO: where to fix?
																			'stroke-width': thickness,
																			'stroke-linejoin': 'miter',
																			'stroke-linecap': 'round',
																			'stroke-opacity': 1 
																			} }-*/;

	public final static native JavaScriptObject stroke(double thickness) /*-{ 
																			return {
																			'stroke': 'white',
																			'stroke-dasharray': '',
																			'stroke-width': thickness,
																			'stroke-linejoin': 'miter',
																			'stroke-linecap': 'round',
																			'stroke-opacity': 1 
																			} }-*/;

	public final static native JavaScriptObject strokeSelected(double thickness) /*-{ 
																					return {
																					'stroke-width': thickness,
																					'stroke': "#3D80DF" // default if it can't inherit from label colour
																					} }-*/;

	public final static native JavaScriptObject strokeVisible() /*-{ 
																return {
																'stroke-dasharray': 'none' // If none makes svg bug? if inheret makes another bug where the hidden is 'stuck' after its visible
																} }-*/;

	public final static native JavaScriptObject strokeHidden() /*-{ 
																return {
																'stroke-dasharray': '.'
																} }-*/;

	public final static native JavaScriptObject handle() /*-{ 
																			return {
																			'stroke': 'black', // default if it can't inherit from label colour
																			'r': 5,
																			'fill': 'red',
																			'stroke-width': 1
																			} }-*/;

	public final static native JavaScriptObject handleArea() /*-{ 
																				return {
																				'stroke': 'black', // default if it can't inherit from label colour
																				'r': 5,
																				'fill': 'red',
																				'stroke-width': 1
																				} }-*/;

	public final static native JavaScriptObject handleHover() /*-{ 
																return {
																'fill': 'white'
																} }-*/;

	public final static native JavaScriptObject handleSelected() /*-{ 
																	return {
																	'fill': "#3D80DF",
																	'stroke': 'white' // default if it can't inherit from label colour
																	} }-*/;

	public final static native JavaScriptObject handleSelectedActive() /*-{ 
																		return {
																		'fill': '#fff' // same as handle selected stroke colour
																		} }-*/;
	

	

}
