package com.thesarvo.guide.client.phototopo;

public class PhotoTopoOptions
{

	/**
	 * The options to pass in when creating a topo
	 * 
	 * @constructor
	 * @property elementId The id of the html div that the topo shold be created
	 *           in
	 * @property {Interger} width The width of the topo in pixels
	 * @property {Interger} height The height of the topo in pixels
	 * @property {String} imageUrl The url to the photo
	 * @property {String} manualColor If you have autoColor turned off
	 * @property {String} manualColorText If you have autoColor turned off
	 * @property {String} manualColorBorder If you have autoColor turned off
	 * @property routes a json hash of routes. Each
	 * @property {Boolean} editable true if you want the widget to be editable
	 * @property {Boolean} seperateRoutes If you want the routes to not overlap
	 *           when they use the same points
	 * @property {Boolean} autoColors If you want the color of the route to be
	 *           inherited from the color of the label
	 * @property {Boolean} autoSize If you want to set the image to not resize
	 *           within the width and height set, eg stretch it (usually not
	 *           what you want - needed for static export)
	 * @property {Boolean} nojs Is there JS? If not then don't render the ghost
	 *           path for click/hover events
	 * @property {Integer} labelSize The label size in pixels
	 * @property {Integer} labelBorder The thickness of the label border in
	 *           pixels
	 * @property {Integer} thickness The thickness of the routes in pixels
	 * @property {Function} onmouseover A callback with the Route
	 * @property {Function} onmouseout A callback with the Route
	 * @property {Function} onclick A callback with the Route
	 * @property {Function} onselect A callback with the Route
	 * @property {Function} ondeselect A callback with the Route
	 * @property {Function} onchange A callback with a JSON dump of all route
	 *           data to persist somehow
	 * @property {Function} getlabel A function which when given a routeId
	 *           should return a RouteLabel
	 * @property {Boolean} showPointTypes If false point types are hidden (eg on
	 *           small versions of a topo)
	 * @property {Float} viewScale A scaling factor for drawing the topo
	 */

	public boolean editable = false;
	public boolean showPointTypes = true;
	public String baseUrl = "../src/";
	public double labelSize = 22;
	public double labelBorder = 1;
	public double viewScale = 1;
	public boolean nojs = false;
	public double height = 600;
	public double width = 400;
	public boolean autoSize = false;
	public double thickness = 3;
	public boolean autoColors = true;
	public boolean seperateRoutes = true;
	public String elementId;

}
