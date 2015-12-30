/*
 * Created on 4/11/2004
 *
 * To change the template for this generated file go to
 * Window - Preferences - Java - Code Generation - Code and Comments
 */
package com.thesarvo.confluence;

import java.util.regex.Pattern;

import org.apache.log4j.Logger;
import org.dom4j.Document;

/**
 * @author jnermut
 * 
 */
public class Guide
{

	public static final String CAT1 = "Sport";
	public static final String CAT0 = "Trad";
	public static final String KEY3 = "25+";
	public static final String KEY2 = "20-24";
	public static final String KEY1 = "16-19";
	public static final String KEY0 = "<16";
	static final Pattern BOLT_PAT = Pattern.compile("[\\d]+B");
//	private static final String CLIMB = "climb";
//	private static final String PROBLEM = "problem";
//	private static final String HEADER = "header";
//	private static final String GPS = "gps";
//	private static final String IMAGE = "image";
//	private static final String TEXT = "text";
//	private static final String GUIDE_JS = "guide184.js";
	public static final String RESOURCE_PATH = "../../download/resources/confluence.extra.guide:guide/";
	/**
	 * Logger for this class
	 */
	private static final Logger logger = Logger.getLogger(Guide.class);

//	private ContentEntityObject content;
//	private final ContentPropertyManager contentPropertyManager;
//	private final SubRenderer subRenderer;
//	RenderContext renderContext;

	// protected XMLFacade data = new XMLFacade();

	protected Document data; // = new XMLFacade();

	private int editIndex = -1;

	// private final MacroParameter parameter;

//	private int page = 0;
//	private static final String JSONRPC_VAR = "jsonrpc";
//	private String url;
//	private static String contextPath;
//	private List<Element> nodes = null;
//
//	GuideMacro guideMacro = null;
//
//	List atlist = null;

//	/**
//	 * @param contentObject
//	 * @param body
//	 * @param contentPropertyManager
//	 * @param macro
//	 */
//	public Guide(ContentEntityObject contentObject, String body,
//			ContentPropertyManager contentPropertyManager, SubRenderer sr,
//			RenderContext rc, GuideMacro macro) throws Exception
//	{
//
//		this.content = contentObject;
//		this.contentPropertyManager = contentPropertyManager;
//
//		this.subRenderer = sr;
//		this.renderContext = rc;
//
//		this.guideMacro = macro;
//
//		// get att list to prevent lazy init exception
//		atlist = content.getLatestVersionsOfAttachments();
//		for (int n = 0; n < atlist.size(); n++)
//		{
//			Attachment at = (Attachment) atlist.get(n);
//			at.getFileName();
//		}
//
//		if (body != null && body.trim().length() > 0)
//		{
//			data = parse(body);
//			// DocumentHelper.createD
//			// data.setXML(body);
//			// logger.debug(body);
//			// System.out.println(body);
//		} else
//		{
//			data = parse("<guide><text class='heading1'>New Guide</text></guide>");
//			// data.setXML("<guide><text class='heading1'>New Guide</text></guide>");
//
//		}
//	}
//
//	public Document parse(String xml)
//	{
//		SAXReader reader = new SAXReader();
//		Document document;
//		try
//		{
//			document = reader.read(xml);
//		} catch (DocumentException e)
//		{
//
//			e.printStackTrace();
//			throw new RuntimeException("Could not parse xml:" + xml, e);
//		}
//		return document;
//	}
//
//	/**
//	 * @param request
//	 * @return
//	 */
//	public String render(HttpServletRequest request, boolean canEdit)
//			throws Exception
//	{
//		request.setAttribute("guide.rendered", Boolean.TRUE);
//		contextPath = request.getContextPath();
//
//		url = content.getUrlPath();
//		url = contextPath + url;
//		System.out.println("base url is :" + url);
//
//		StringBuffer ret = new StringBuffer();
//		List<Element> list = getNodes();
//
//		String user = request.getRemoteUser();
//
//		boolean showEditIcons = false;
//		boolean showEditCommand = false;
//
//		if (user != null)
//		{
//			if (request.getParameter("guide.editGuide") != null)
//				showEditIcons = true;
//			else
//			{
//				showEditCommand = canEdit;
//
//			}
//
//			// System.out.println(user);
//		}
//
//		// ret.append("<style> \n .imgMax { max-width: 800px; width:expression(  this.width > 800 ? \"800px\" :  (this.width!=null ? this.width : auto ) ) ; } ");
//		// ret.append("\n</style> \n");
//
//		// ret.append(
//		// "<script>\n" +
//		// ""
//		// src="$req.contextPath/download/resources/confluence.extra.livesearch:livesearch/livesearch.js
//		String src = RESOURCE_PATH + GUIDE_JS;
//
//		ret
//				.append("\n<script language='javascript' type='text/javascript' src='"
//						+ src + "' ></script>");
//
//		src = RESOURCE_PATH + "jsonrpc.js";
//		ret
//				.append("\n<script language='javascript' type='text/javascript' src='"
//						+ src + "' ></script>");
//
//		ret.append("\n<link rel='stylesheet' href='" + RESOURCE_PATH
//				+ "guide.css' type='text/css' />\n");
//
//		if (showEditIcons)
//			ret
//					.append("\n<script defer='true'>try{"
//							+ JSONRPC_VAR
//							+ " = new JSONRpcClient('"
//							+ contextPath
//							+ "/plugins/servlet/json');} catch (e){alert('Error talking to server. Maybe youve got an old browser? This application needs IE 5.5+ or Firefox/Mozilla 1+. Please contact jon@thesarvo.com and describe the problem: '+e);}</script>");
//
//		// ret.append("\n<script defer='true' >alert(" + JSONRPC_VAR +
//		// ".system.listMethods());</script>");
//		// ret.append("\n<script defer='true' >alert(" + JSONRPC_VAR +
//		// ".guideMacro.hello());</script>");
//
//		// ret.append("\n<div id='guide.pleaseWait' style='display:none;position:absolute;top:300px;left:300px;width:200px;height:100px;text-align:center;background-color:silver;color:black;font-size:10pt;font-weight:bold;border: 2px solid gray;' ><br>Please Wait...</div>");
//
//		if (showEditCommand || showEditIcons)
//		{
//			ret
//					.append("<div style='font-size:12pt;font-weight:bold;padding:6px'>");
//
//			if (showEditCommand)
//			{
//				ret.append("<a title='Click to edit this guide' href='" + url
//						+ "?guide.editGuide=true&guide.page=" + page + "'>");
//				ret.append("<img border=0 src='");
//				ret.append(contextPath + "/images/icons/edit_only_16.gif");
//				ret.append("' >");
//				ret.append(" Edit this Guide");
//			} else
//			{
//				ret.append("<a title='Click to stop editing this guide' href='"
//						+ url + "?guide.page=" + page + "'>Stop Editing");
//			}
//			ret.append("</a>");
//			ret.append("</div>");
//		}
//
//		// ret.append("\n<table border=0 width=100%>");
//
//		// String ps = data.getAttribute("guide", "pagesize");
//
//		String ps = data.selectSingleNode("//guide/@pagesize").getText();
//
//		int pageSize = 60;
//		if (ps != null && ps.length() > 0)
//			pageSize = Integer.parseInt(ps);
//
//		int length = list.size();
//		boolean paging = false;
//		int start = 0;
//		int end = length - 1;
//		int pages = 1;
//
//		if (length > pageSize + 20)
//		{
//			paging = true;
//			pages = length / pageSize;
//			for (int x = pages * pageSize + 1; x < length; x++)
//			{
//				Element node = (Element) list.get(x);
//
//				// String sClass=data.getAttribute(node,"class");
//				String sClass = node.attributeValue("class");
//
//				if (sClass != null && sClass.startsWith("heading"))
//				{
//					pages++;
//					break;
//				}
//			}
//
//			if (page >= 0)
//			{
//				if (page > 0)
//				{
//					start = page * pageSize;
//					Element node = (Element) list.get(start);
//					String sClass = null;
//					while (start < length - 1
//							&& ((sClass = node.attributeValue("class")) == null || !sClass
//									.startsWith("heading")))
//					{
//						node = (Element) list.get(++start);
//					}
//				}
//
//				if (page < pages - 1)
//				{
//					end = (page + 1) * pageSize;
//
//					if (end < start)
//						end = start + 1;
//					if (end > length - 1)
//						end = length - 1;
//
//					Element node = list.get(end);
//					String sClass = null;
//					while (end < length - 1
//							&& ((sClass = node.attributeValue("class")) == null || !sClass
//									.startsWith("heading")))
//					{
//						node = list.get(++end);
//					}
//					if (end != length - 1)
//						end--;
//
//				}
//			}
//		}
//
//		if (paging)
//		{
//			renderPager(url, ret, pages, showEditIcons);
//		}
//
//		for (int i = start; i <= end; i++)
//		{
//			renderNode(ret, showEditIcons, showEditIcons, false, false, i);
//		}
//
//		if (paging)
//		{
//			// ret.append("<tr><td>&nbsp;</td></tr>");
//			ret.append("<br>");
//			renderPager(url, ret, pages, showEditIcons);
//		}
//
//		// ret.append("</table>");
//
//		return ret.toString();
//	}
//
//	/**
//	 * @param ret
//	 * @param list
//	 * @param showEditIcons
//	 * @param index
//	 * @throws XMLFacadeException
//	 */
//	public void renderNode(StringBuffer ret, boolean showEditIcons,
//			boolean showInsert, boolean afterInsert, boolean innerOnly,
//			int index)
//	{
//		try
//		{
//			List<Element> list = getNodes();
//			Element node = list.get(index);
//			// String value = data.getValue(node);
//			String value = node.getText();
//			if (value == null)
//				value = "";
//
//			// value += "+";
//			// data.setValue(node,".",value);
//
//			String type = node.getName();
//
//			boolean editingNode = (editIndex == index);
//
//			// if (editIndex<0 || editingNode)
//			// {
//
//			// ret.append("\n<tr><td width='99%' >");
//
//			String style = "margin-top:6px;";
//			if (showEditIcons)
//				style += "padding:4px;padding-right: 40px; border:1px dashed #e8e8e8;";
//
//			if (!innerOnly)
//			{
//				ret.append("\n<div id='guide.div." + index + "' ");
//				ret.append(" style='" + style + "' >");
//			}
//			ret.append("<a name='guide.id." + index + "' ></a>");
//			// ret.append("<script>a(" + i + ");</script>");
//
//			if (editingNode)
//			{
//				ret
//						.append("<div class='panel'><div class='panelContent'><b>Edit "
//								+ type + ":</b><div>");
//				ret.append("<form name='guide_edit_form' action='"
//						+ content.getUrlPath() + "?guide.page="
//						+ getPageString() + "#guide.id." + index
//						+ "' method='get' >");
//				ret.append("<input type=hidden name='guide.id' value='" + index
//						+ "' />");
//				ret
//						.append("<input type=hidden name='guide.action' value='submit' />");
//				ret.append("<input type=hidden name='guide.page' value='"
//						+ page + "' />");
//				ret.append("<input type=hidden name='guide.type' value='"
//						+ type + "' />");
//			}
//
//			if (type.equals(TEXT))
//			{
//				renderText(ret, node, value, editingNode, index, afterInsert);
//			}
//			if (type.equals(IMAGE))
//			{
//				renderImage(ret, node, editingNode, index, contextPath,
//						afterInsert);
//			}
//			if (type.equals(GPS))
//			{
//				renderGps(ret, node, editingNode, index, contextPath,
//						afterInsert);
//			}
//			if (type.equals(HEADER))
//			{
//				renderHeader(ret, node, editingNode, index, contextPath,
//						afterInsert);
//			}
//			if (type.equals(PROBLEM) || type.equals(CLIMB))
//			{
//				renderProblem(ret, node, value, type, editingNode, index,
//						contextPath, afterInsert);
//			}
//
//			if (editingNode)
//			{
//				ret.append("</form></div></div></div>");
//			}
//
//			if (showEditIcons)
//			{
//				// String url = "/" + request.getContextPath() +
//				// GeneralUtil.customGetPageUrl(content);
//
//				// ret.append("</td>\n<td width='1%' nowrap >");
//
//				if (!editingNode)
//				{
//					ret
//							.append("<div style='text-align:right; position:relative;left:32px;' >");
//					String p = getPageString();
//					// ret.append("<script>b("+i+"," + getPageString() +
//					// ");</script>");
//					// ret.append("<a title='Click to edit this content' href='"
//					// + url + "?guide.action=edit&guide.id=" + i +
//					// "&guide.page="+p+ "#guide.id." + i + "'>");
//					ret
//							.append("<a  title='Click to edit this content' href='javascript:void(0)' onclick='edit(\""
//									+ index + "\");return false;' >");
//					ret.append("<img border=0 src='");
//					ret.append(contextPath + "/images/icons/edit_only_16.gif");
//					ret.append("' />");
//					ret.append("</a>");
//					// ret.append("<a  title='Click to delete this content' href='"
//					// + url + "?guide.action=delete&guide.id=" + index +
//					// "&guide.page="+p+ "#guide.id." + index + "'>");
//					ret
//							.append("<a  title='Click to delete this content' href='javascript:void(0)' onclick='if (confirm(\"Are you sure you want to remove this? You cant undo this action.\")) remove(\""
//									+ index + "\");return false;' >");
//					ret
//							.append("<img border=0 title='Click to delete this content' src='");
//					ret.append(contextPath + "/images/icons/trash_16.gif");
//					ret.append("' />");
//					ret.append("</a>");
//					ret.append("</div>");
//				}
//			}
//			if (!innerOnly)
//				ret.append("</div>");
//			// ret.append("</td></tr>");
//
//			if (showInsert)
//			{
//				renderInsert(ret, index);
//			}
//
//			// }
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error rendering node", e);
//			throw new RuntimeException("Error rendering node", e);
//		}
//	}
//
//	private void renderHeader(StringBuffer ret, Node node, boolean editingNode,
//			int index, String contextPath2, boolean afterInsert)
//	{
//		try
//		{
//			String name = getAttr(node, "name");
//			String acknowledgement = getAttr(node, "acknowledgement");
//			String intro = getAttr(node, "intro");
//			String access = getAttr(node, "access");
//			String history = getAttr(node, "history");
//			String rock = getAttr(node, "rock");
//			String sun = getAttr(node, "sun");
//			String walk = getAttr(node, "walk");
//
//			if (!editingNode)
//			{
//				// ret.append( "\n<div class='guideheading' >" );
//
//				tag(ret, name, "heading1", "h1");
//
//				ret
//						.append("<table cellpadding=4 cellspacing=0 width=100% ><tr>");
//
//				leftcell(ret);
//
//				renderGraph(ret);
//
//				closeCell(ret);
//
//				rightCell(ret);
//
//				ret.append("<table>");
//
//				iconRow(ret, "walk1.png", walk);
//				iconRow(ret, "sun1.png", sun);
//				iconRow(ret, "rock1.png", rock);
//
//				ret.append("</table>");
//
//				closeCell(ret);
//				closeRow(ret);
//
//				renderIndentedText(ret, acknowledgement, "Acknowledgement");
//
//				renderIndentedText(ret, intro, "Introduction");
//
//				renderIndentedText(ret, history, "History");
//
//				renderIndentedText(ret, access, "Access");
//
//				ret.append("</table>");
//
//			} else
//			{
//				ret.append("<div>");
//
//				ret.append("<table>");
//
//				renderInputText(ret, "Name", "name", name);
//
//				renderInputText(ret, "Walk", "walk", walk);
//
//				ret.append("<tr><td valign=top alight=right> Sun: </td><td>");
//				ret.append("<select name='sun' >");
//				renderOption(ret, sun, "");
//				renderOption(ret, sun, "Morning sun");
//				renderOption(ret, sun, "Afternoon sun");
//				renderOption(ret, sun, "All day sun");
//				renderOption(ret, sun, "Mixed sun and shade");
//				renderOption(ret, sun, "Not much sun");
//				ret.append("</select></td></tr>");
//
//				renderInputText(ret, "Rock", "rock", rock);
//
//				renderInputText(ret, "Acknowledgement", "acknowledgement",
//						acknowledgement);
//
//				renderTextarea(ret, "Intro", "intro", intro);
//				renderTextarea(ret, "History", "history", history);
//				renderTextarea(ret, "Access", "access", access);
//
//				ret.append("</table>");
//				ret.append("</div>");
//
//				renderSaveCancel(ret, index, afterInsert);
//			}
//
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error rendering node", e);
//			throw new RuntimeException("Error rendering node", e);
//		}
//
//	}
//
//	private void renderInputText(StringBuffer ret, String caption,
//			String formName, String val)
//	{
//		ret.append("<tr><td valign=top alight=right > ");
//		ret.append(" ").append(caption).append(": ");
//		ret.append("</td><td>");
//		ret.append("<input type=text style='width:600px' name='" + formName
//				+ "' value='" + encodeBasic(val) + "' /> ");
//		ret.append("</td></tr>");
//	}
//
//	private void renderTextarea(StringBuffer ret, String caption,
//			String formName, String val)
//	{
//		ret.append("<tr><td valign=top align=right> ");
//		ret.append(" ").append(caption).append(": ");
//		ret.append("</td><td>");
//		ret.append("<textarea style='width:600px;height:250px' name='"
//				+ formName + "'>");
//		ret.append(encodeForTA(val));
//		ret.append("</textarea>");
//		ret.append("</td></tr>");
//	}
//
//	private void renderGraph(StringBuffer ret)
//	{
//
//		tryd
//		{
//			ChartMacro cm = new ChartMacro();
//			// cm.setSubRenderer( this.subRenderer );
//
//			com.atlassian.spring.container.ContainerManager
//					.autowireComponent(cm);
//
//			HashMap<String, String> params = new HashMap<String, String>();
//
//			// Page page = (Page) ((PageContext)renderContext).getEntity();
//			// NodeList climbs = data.findNodes("//climb");
//
//			List<Element> climbs = data.selectNodes("//climb");
//
//			if (climbs.size() > 0)
//			{
//				int[] grades = getGradeCount(climbs);
//
//				int total = 0;
//				// for (int i=0;i<grades.length;i++)
//				// total += grades[i];
//				total = climbs.getLength();
//
//				String title = total + " routes";
//
//				params.put("type", "bar");
//				params.put("stacked", "true");
//				params.put("title", title);
//				params.put("colors", "black,red");
//				params.put("height", "200");
//				params.put("width", "205");
//				params.put("borderColor", "#cccccc");
//
//				String body = "|| Grade || " + KEY0 + " || " + KEY1 + " || "
//						+ KEY2 + " || " + KEY3 + " ||";
//				body += "\n|| " + CAT0 + " | " + grades[0] + " | " + grades[1]
//						+ " | " + grades[2] + " | " + grades[3] + " |";
//				body += "\n|| " + CAT1 + " | " + grades[4] + " | " + grades[5]
//						+ " | " + grades[6] + " | " + grades[7] + " |";
//
//				String output = cm.execute(params, body, renderContext);
//				ret.append(output);
//			}
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			ret.append("Error rendering chart: " + e.getMessage());
//		}
//
//	}
//
//	public static int[] getGradeCount(NodeList climbs)
//			throws XMLFacadeException
//	{
//		int[] grades = new int[8];
//
//		for (int i = 0; i < climbs.getLength(); i++)
//		{
//			Node node = climbs.item(i);
//
//			String grade = getAttr(node, "grade");
//			String extra = getAttr(node, "extra");
//
//			boolean sport = extra.contains("XXXXXXXXX")
//					|| BOLT_PAT.matcher(extra).find();
//
//			if (grade != null && grade.length() > 0)
//			{
//				if (grade.indexOf('/') > 0)
//				{
//					grade = grade.substring(0, grade.indexOf('/'));
//				}
//				grade = grade.replace('?', ' ');
//				grade = grade.replace('M', ' ');
//				grade = grade.replace('A', ' ');
//				grade = grade.trim();
//				if (grade.indexOf(' ') > 0)
//				{
//					grade = grade.substring(0, grade.indexOf(' '));
//				}
//				grade = grade.trim();
//
//				int g = -1;
//
//				try
//				{
//					g = Integer.parseInt(grade);
//				} catch (NumberFormatException e)
//				{
//				}
//
//				if (g > -1)
//				{
//					int off = sport ? 4 : 0;
//
//					if (g < 16)
//						grades[0 + off]++;
//					else if (g < 20)
//						grades[1 + off]++;
//					else if (g < 25)
//						grades[2 + off]++;
//					else
//						grades[3 + off]++;
//
//				}
//
//			}
//		}
//		return grades;
//	}
//
//	private void iconRow(StringBuffer ret, String img, String text)
//	{
//		row(ret);
//		cell(ret);
//
//		if (text != null && text.trim().length() > 0)
//			img(ret, img);
//
//		closeCell(ret);
//		cell(ret);
//		if (text != null && text.trim().length() > 0)
//			ret.append(encodeWithLF(text));
//		closeCell(ret);
//		closeRow(ret);
//	}
//
//	private void img(StringBuffer ret, String img)
//	{
//		ret.append("<img src='" + RESOURCE_PATH + img + "' />");
//	}
//
//	private void closeRow(StringBuffer ret)
//	{
//		ret.append("</tr>");
//	}
//
//	private void cell(StringBuffer ret)
//	{
//		ret.append("<td>");
//	}
//
//	private void row(StringBuffer ret)
//	{
//		ret.append("<tr>");
//	}
//
//	private void rightCell(StringBuffer ret)
//	{
//		ret.append("<td  class='tsrightcell' >");
//	}
//
//	private void closeCell(StringBuffer ret)
//	{
//		ret.append("</td>");
//	}
//
//	private void leftcell(StringBuffer ret)
//	{
//		ret.append("<td class='tsleftcell' >");
//	}
//
//	private void renderIndentedText(StringBuffer ret, String text,
//			String heading)
//	{
//		if (text != null && text.length() > 0)
//		{
//			row(ret);
//			leftcell(ret);
//
//			div(ret, heading, "tssubhead");
//
//			closeCell(ret);
//
//			rightCell(ret);
//
//			div(ret, text, "tssubcont");
//
//			closeCell(ret);
//
//			closeRow(ret);
//
//		}
//	}
//
//	private void div(StringBuffer ret, String text, String clazz)
//	{
//		ret.append("<div class='").append(clazz).append("' >").append(
//				encodeWithLF(text)).append("</div>");
//	}
//
//	private String encodeWithLF(String str)
//	{
//		str = encodeForTA(str);
//
//		str = str.replaceAll(Pattern.quote("\n"), "<br/>");
//
//		return str;
//	}
//
//	private String encodeForTA(String str)
//	{
//		str = str.replaceAll("<br/>", "\n");
//		str = Encode.htmlEncode(str);
//		return str;
//	}
//
//	private static String getAttr(Node node, String attrnanme)
//			throws XMLFacadeException
//	{
//		NamedNodeMap oAttrNodeMap = node.getAttributes();
//		if (oAttrNodeMap == null)
//			return "";
//
//		Attr attr = (Attr) oAttrNodeMap.getNamedItem(attrnanme);
//
//		String ret = attr != null ? attr.getValue() : null;
//
//		if (ret == null)
//			ret = "";
//
//		return ret.trim();
//	}
//
//	private void renderGps(StringBuffer ret, Node node, boolean editingNode,
//			int index, String contextPath2, boolean afterInsert)
//	{
//		try
//		{
//			String ref = getAttr(node, "ref");
//			Page page = null;
//			Page currentPage = (Page) ((PageContext) renderContext).getEntity();
//
//			List<Point> points = new ArrayList<Point>();
//
//			if (ref != null && ref.length() > 0)
//			{
//				PageManager pm = (PageManager) com.atlassian.spring.container.ContainerManager
//						.getComponent("pageManager");
//
//				page = pm.getPage(currentPage.getSpaceKey(), ref);
//
//				getGpsPoints(points, page, true);
//
//			} else
//			{
//				page = currentPage;
//
//				NodeList pointsNL = data.findNodes(node, "point");
//
//				getPointListFromNodes(pointsNL, points, page);
//			}
//
//			Collections.sort(points);
//
//			if (!editingNode)
//			{
//				if (points.size() == 0 && page.getChildren().size() > 0)
//					getGpsPoints(points, page, true);
//
//				ret
//						.append("<table cellpadding=4 cellspacing=0 width=100% ><tr>");
//
//				leftcell(ret);
//
//				div(ret, "GPS", "tssubhead");
//
//				// img(ret, "gpsicon.png");
//
//				closeCell(ret);
//
//				rightCell(ret);
//
//				startGpsTable(ret);
//
//				for (Point point : points)
//				{
//					row(ret);
//
//					cell(ret, point.getCode());
//					cell(ret, point.getDescription());
//					cell(ret, point.getZone());
//					cell(ret, Integer.toString(point.getEasting()));
//					cell(ret, Integer.toString(point.getNorthing()));
//					cell(ret, Integer.toString(point.getHeight()));
//
//					// cell(ret, "GDA94" );
//					// TODO the list link
//					ret.append("<td nowrap>");
//					ret.append("GDA94 UTM &nbsp;&nbsp;");
//					ret
//							.append("<a style='font-size:7pt;' title='Click to open a 1:25K map centred on this point on theLIST' target='_blank' href='");
//					// ret.append("window.open(\"");
//					ret
//							.append("http://www.thelist.tas.gov.au/listmap/listmap.jsp?dx=2000&layers=5&centrex=");
//					ret.append(point.getEasting());
//					ret.append("&centrey=");
//					ret.append(point.getNorthing());
//					ret.append("' >theLIST</a>");
//					closeCell(ret);
//
//					closeRow(ret);
//				}
//
//				closeTable(ret);
//
//				if (points.size() > 0)
//				{
//					// row(ret);
//					// ret.append("<td colspan=6>");
//					ret.append("<div style='vertical-align:middle' >");
//
//					ret
//							.append("<a href='http://www.utas.edu.au/spatial/locations/index.html' title='Click for an introduction to co-ordinate systems in Tasmania' >");
//					ret.append("<img border=0 src='");
//					ret.append(contextPath
//							+ "/images/icons/emoticons/information.gif");
//					ret.append("' /></a>&nbsp;&nbsp;");
//
//					ret
//							.append("<a title='Click to download a KML file that will open in Google Earth or can be loaded into your GPS' href='");
//					ret.append(contextPath + "/plugins/servlet/ts.kml?pageId=");
//					ret.append(page.getId());
//					ret.append("' >");
//					ret
//							.append("<img border=0 src='http://www.google.com/earth/images/google_earth_feed.gif' />");
//					ret.append("</a>");
//					ret.append("&nbsp;");
//					ret.append("&nbsp;");
//					ret.append("&nbsp;");
//
//					ret
//							.append("<a style='font-size:7pt;' title='Click to open these points in Google Maps in a new window' target='_blank' href='");
//					ret.append(RESOURCE_PATH + "thesarvomaps.html?url=");
//
//					String url = "http://www.thesarvo.com/confluence/plugins/servlet/ts.kml?pageId="
//							+ page.getId();
//					ret.append(URLEncoder.encode(url));
//
//					double[] centre = KmlServlet.getLatLong(points.get(0));
//					ret.append("&lat=");
//					ret.append(URLEncoder.encode(Double.toString(centre[1])));
//					ret.append("&long=");
//					ret.append(URLEncoder.encode(Double.toString(centre[0])));
//
//					String zoom = "16";
//					if (points.size() > 10)
//						zoom = "12";
//					if (points.size() > 30)
//						zoom = "8";
//
//					ret.append("&zoom=").append(zoom);
//
//					ret.append("' >");
//
//					ret.append("Google Maps");
//					// ret.append("<img src='http://www.google.com/earth/images/google_earth_feed.gif' />");
//
//					ret.append("</a>");
//
//					ret.append("</div>");
//				}
//
//				closeCell(ret);
//				closeRow(ret);
//
//				// closeRow(ret);
//
//				closeTable(ret);
//
//			} else
//			{
//				ret.append("<div>");
//
//				startGpsTable(ret);
//
//				for (int i = 0; i < 7; i++)
//					points.add(new Point());
//
//				for (int i = 0; i < points.size(); i++)
//				{
//					Point p = points.get(i);
//
//					row(ret);
//
//					inputCell(ret, "code" + i, p.getCode(), "80");
//					inputCell(ret, "description" + i, p.getDescription(), "150");
//
//					inputCell(ret, "zone" + i, p.getZone(), "50");
//					inputCell(ret, "easting" + i, Integer.toString(p
//							.getEasting()), "100");
//					inputCell(ret, "northing" + i, Integer.toString(p
//							.getNorthing()), "100");
//					inputCell(ret, "height" + i, Integer
//							.toString(p.getHeight()), "60");
//
//					cell(ret, "GDA94");
//
//					closeRow(ret);
//				}
//
//				ret.append("</table>");
//				ret.append("</div>");
//
//				renderSaveCancel(ret, index, afterInsert);
//			}
//
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error rendering node", e);
//			throw new RuntimeException("Error rendering node", e);
//		}
//
//	}
//
//
//	private void inputCell(StringBuffer ret, String name, String val,
//			String width)
//	{
//		cell(ret);
//
//		ret.append("<input type='text' style='width:" + width + "px' name='");
//		ret.append(name);
//		ret.append("' value='");
//		ret.append(encodeBasic(val));
//		ret.append("' title='");
//		ret.append(name + "' />");
//
//		closeCell(ret);
//	}
//
//	private void closeTable(StringBuffer ret)
//	{
//		ret.append("</table>");
//	}
//
//	private void startGpsTable(StringBuffer ret)
//	{
//		ret.append("<table class='grid'>");
//
//		row(ret);
//
//		ret
//				.append("<th>Code</th><th>Description</th><th>Zone</th><th>Easting</th><th>Northing</th><th>Height</th><th></th>");
//
//		closeRow(ret);
//	}
//
//	private void cell(StringBuffer ret, String text)
//	{
//		cell(ret);
//		ret.append(text);
//		closeCell(ret);
//	}
//
//	private void renderInsert(StringBuffer ret, int index)
//	{
//		// ret.append("<script>c("+i+"," + getPageString() + ");</script>");
//		// String p = getPageString();
//		ret.append("\n<div style='text-align:right'>");
//		ret.append("<select style='display:none' id='guideinsert" + index
//				+ "' ");
//		// ret.append(" ONCHANGE=\"if (this.options[this.selectedIndex].value!='') location = '"
//		// + content.getUrlPath() + "?guide.action=insert&guide.page=" + p +
//		// "&guide.id=" + index +
//		// "&guide.type='+this.options[this.selectedIndex].value + '#guide.id."
//		// + (index+1) + "';\" >");
//		ret
//				.append(" ONCHANGE=\"if (this.options[this.selectedIndex].value!='') insert('"
//						+ index
//						+ "',this.options[this.selectedIndex].value);this.style.display='none'\" >");
//		ret.append("<option value='' >Insert...</option>");
//		ret.append("<option value='" + TEXT + "' >Insert Text</option>");
//		ret.append("<option value='" + IMAGE + "' >Insert Image</option>");
//		ret.append("<option value='" + PROBLEM + "' >Insert Problem</option>");
//		ret.append("<option value='" + CLIMB + "' >Insert Climb</option>");
//		ret.append("<option value='" + GPS + "' >Insert GPS</option>");
//		ret.append("<option value='" + HEADER
//				+ "' >Insert Header Block</option>");
//
//		ret.append("</select>");
//
//		ret
//				.append("\n<img border=0 title='Click to insert a climb,problem,text or image' style='cursor:pointer' src='");
//		ret.append(contextPath + "/images/icons/plus.gif");
//		ret.append("' onclick=\"document.getElementById('guideinsert" + index
//				+ "').style['display']='inline';\"  />");
//
//		ret.append("</div>");
//		ret.append("<div id='guide.insert." + index + "' ></div>");
//	}
//
//	/**
//	 * @return
//	 * @throws XMLFacadeException
//	 */
//	// private NodeList getList()
//	// {
//	// try
//	// {
//	// return data.findNodes("guide/*");
//	// }
//	// catch (XMLFacadeException e)
//	// {
//	// logger.error("error getting node list",e);
//	// throw new RuntimeException("error getting node list",e);
//	// }
//	// }
//
//	/**
//	 * @return
//	 */
//	private String getPageString()
//	{
//		return ((page == -1) ? "all" : Integer.toString(page));
//	}
//
//	/**
//	 * @param url
//	 * @param ret
//	 * @param pages
//	 */
//	private void renderPager(String url, StringBuffer ret, int pages,
//			boolean showEditIcon)
//	{
//		ret.append("<div>Page: ");
//		for (int p = 1; p <= pages; p++)
//		{
//			if (page == p - 1)
//				ret.append("<b>" + p + "</b>");
//			else
//			{
//				ret.append("<a href='");
//				ret.append(url + "?guide.page=" + (p - 1));
//				if (showEditIcon)
//					ret.append("&guide.editGuide=true");
//
//				ret.append("' >");
//				ret.append(p);
//				ret.append("</a>");
//			}
//			ret.append(" | ");
//		}
//		if (page == -1)
//			ret.append("<b>All</b>");
//		else
//		{
//			ret.append("<a href='" + url + "?guide.page=all");
//			if (showEditIcon)
//				ret.append("&guide.editGuide=true");
//
//			ret.append("' >All</a>");
//		}
//		ret.append("</div>");
//	}
//
//	/**
//	 * @param ret
//	 * @param node
//	 * @param value
//	 * @param type
//	 * @param request
//	 * @throws XMLFacadeException
//	 */
//	private void renderProblem(StringBuffer ret, Node node, String value,
//			String type, boolean editingNode, int index, String contextPath,
//			boolean afterInsert) throws XMLFacadeException
//	{
//
//		String stars = data.getAttribute(node, "stars");
//		if (stars == null)
//			stars = "";
//
//		String number = data.getAttribute(node, "number");
//		if (number == null)
//			number = "";
//
//		String length = data.getAttribute(node, "length");
//		if (length == null)
//			length = " ";
//
//		String grade = data.getAttribute(node, "grade");
//		if (grade == null)
//			grade = "";
//
//		String extra = data.getAttribute(node, "extra");
//		if (extra == null)
//			extra = "";
//
//		String name = data.getAttribute(node, "name");
//		if (name == null)
//			name = "";
//
//		String fa = data.getAttribute(node, "fa");
//		if (fa == null)
//			name = "";
//
//		if (!editingNode)
//		{
//			ret.append("\n<div class='" + type + "' >");
//			ret.append("<div >");
//
//			// stars = stars.replaceAll("\\*","<img src='" + "/" +
//			// request.getContextPath() +
//			// "images/icons/emoticons/star_red.png' />");
//			int numStars = stars.trim().length();
//			// stars = "<img src='../../images/icons/" + numStars +
//			// "star.gif' />";
//			stars = "<img src='" + RESOURCE_PATH + numStars + "star.gif' />";
//
//			ret.append(stars + " ");
//			if (number.length() == 0)
//				number = "&nbsp;&nbsp;";
//			ret.append("<span style='width: 16px'>" + number
//					+ "</span> <span style='font-weight:bold'>");
//			ret.append(name + "&nbsp;&nbsp;");
//			ret.append(length + "&nbsp;&nbsp;");
//			ret.append(grade + "&nbsp;&nbsp;");
//
//			extra += " ";
//			extra = extra.replaceAll("B ", "XXXXXXXXXXXXX ");
//
//			ret.append("</span>" + extra + " ");
//			ret.append("</div>");
//			ret.append("<div style='margin-left: 56px' >");
//			ret.append(Encode.htmlEncode(value).replaceAll("\n", "<br/>"));
//			ret
//					.append("<div style='margin-left: 56px; font-size:7pt;color-gray;font-style: italic; ' >");
//			ret.append(Encode.htmlEncode(fa));
//			ret.append("</div></div>");
//		} else
//		{
//			ret.append("<div>");
//
//			ret.append("<select name='stars' >");
//			renderOption(ret, stars, "");
//			renderOption(ret, stars, "*");
//			renderOption(ret, stars, "**");
//			renderOption(ret, stars, "***");
//			ret.append("</select>");
//
//			ret.append("Number: ");
//			ret
//					.append("<input type=text style='width:50px' name='number' value='"
//							+ encodeAttr(number) + "' /> ");
//
//			ret.append(" Name: ");
//			ret
//					.append("<input type=text style='width:150px' name='name' value='"
//							+ encodeAttr(name) + "' /> ");
//
//			if (type.equals(CLIMB))
//			{
//				ret.append(" Length: ");
//				ret
//						.append("<input type='text' style='width:50px' name='len' value='"
//								+ encodeAttr(length) + "' /> ");
//			}
//
//			ret.append(" Grade: ");
//			ret
//					.append("<input type=text style='width:50px' name='grade' value='"
//							+ encodeAttr(grade) + "' /> ");
//
//			if (type.equals(CLIMB))
//			{
//				ret.append(" Extra: ");
//				ret
//						.append("<input type=text style='width:50px' name='extra' value='"
//								+ encodeAttr(extra) + "' /> ");
//			} else
//			{
//				ret.append("<select name='extra' >");
//				renderOption(ret, extra, "");
//				renderOption(ret, extra, "(SDS)");
//				renderOption(ret, extra, "(Stand)");
//				renderOption(ret, extra, "(Hang)");
//				renderOption(ret, extra, "(Highball)");
//				renderOption(ret, extra, "(Highball, Stand)");
//				renderOption(ret, extra, "(Highball, SDS)");
//				ret.append("</select>");
//
//			}
//
//			ret.append("</div><div>");
//
//			ret
//					.append("<textarea style='width:600px;height:250px' name='value'  >");
//			ret.append(encodeForTA(value));
//			ret.append("</textarea><br/>");
//
//			ret.append(" FA: ");
//			ret.append("<input type=text style='width:500px' name='fa' value='"
//					+ encodeAttr(fa) + "' /> ");
//
//			ret.append("</div>");
//
//			renderSaveCancel(ret, index, afterInsert);
//		}
//	}
//
//	public String encodeBasic(String str)
//	{
//		String ret = Encode.htmlEncode(str);
//
//		return ret;
//	}
//
//	public String encodeAttr(String str)
//	{
//		String ret = Encode.htmlEncode(str);
//		ret = ret.replaceAll("\'", "&apos;");
//		return ret;
//	}
//
//	/**
//	 * @param ret
//	 * @param node
//	 * @throws XMLFacadeException
//	 */
//	private void renderImage(StringBuffer ret, Node node, boolean editingNode, int index,String contextPath, boolean afterInsert) throws XMLFacadeException
//	{
//		((Element)node).
//		String src=data.getAttribute(node,"src");
//		String width=data.getAttribute(node,"width");
//		String noPrint=data.getAttribute(node,"noPrint");
//		if (noPrint==null)
//			noPrint="";
//
//		if (src==null)
//			src="";
//
//		if (!editingNode)
//		{
//			if (src!=null && src.length()>0)
//			{
//				//List atlist = content.getAttachments();
//				//atlist = content.getLatestVersionsOfAttachments();
//				for (int n=0;n<atlist.size();n++)
//				{
//					Attachment at = (Attachment) atlist.get(n);
//					if (at.getFileName().equals(src) )
//					{
//						//String path = guideMacro.getContextPath() + at.getDownloadPath();
//						String path = "../.." + at.getDownloadPathWithoutVersion();
//
//						//table(ret);
//						//leftcell(ret);
//						//ret.append("&nbsp;");
//						//closeCell(ret);
//						//rightCell(ret);
//						
//						ret.append( "<div><img src='");
//						ret.append( path );
//						ret.append("' ");
//						if (width!=null && width.length()>0)
//							ret.append("width='").append(width).append("'");
//						ret.append(" /></div>");
//						
//						//closeCell(ret);
//						//closeTable(ret);
//						
//						break;
//					}
//				}
////				String wik = "!" + src + "|";
////				//class=imgMax,onreadystatechange='if (this.readystate==\"complete\") this.className=\"imgMax\";'";
////				if (width!=null && width.length()>0)
////					wik += "width=" + width;
////
////				wik += "!\n";
////
////				renderWiki( ret, wik);
//			}
//		}
//		else
//		{
//			if (width==null)
//				width="";
//
//			ret.append("<div> Choose an attached image: ");
//			ret.append("<select name='src' >");
//
//			for (int n=0;n<atlist.size();n++)
//			{
//				Attachment at = (Attachment) atlist.get(n);
//				renderOption(ret,src,at.getFileName());
//			}
//			ret.append("</select>");
//			ret.append(" Width: ");
//			ret.append("<select name='width' >");
//			renderOption(ret,width,"auto","");
//			renderOption(ret,width,"100");
//			renderOption(ret,width,"200");
//			renderOption(ret,width,"300");
//			renderOption(ret,width,"400");
//			renderOption(ret,width,"500");
//			renderOption(ret,width,"600");
//			renderOption(ret,width,"700");
//			renderOption(ret,width,"800");
//			ret.append("</select>");
//			ret.append("<br/><input type='checkbox'  name='noPrint' value='true' " + ( ("true".equals(noPrint)) ? "checked" : "" )+ " >Not in print ");
//
//			ret.append("<br/><br/></div><div>To upload an image <b>");
//			// /pages/viewpageattachments.action?pageId=234#attachFile
//			ret.append("<a href='" + contextPath + "/pages/viewpageattachments.action?pageId=" + content.getIdAsString() + "#attachFile" );
//			//ret.append("<a href='/" + contextPath + "pages/attachfile.action?pageId=" + content.getIdAsString() );
//			ret.append("' >Attach File</a></b><br/><br/></div>");
//
//			renderSaveCancel(ret, index, afterInsert);
//		}
//	}
//
//	private void table(StringBuffer ret)
//	{
//		ret.append("<table>");
//	}
//
//	/**
//	 * @param ret
//	 * @param width
//	 * @param string
//	 * @param string2
//	 */
//	private void renderOption(StringBuffer ret, String selectedVal, String name)
//	{
//		renderOption(ret, selectedVal, name, name);
//
//	}
//
//	/**
//	 * @param ret
//	 * @param node
//	 * @param value
//	 * @param editingNode
//	 * @throws XMLFacadeException
//	 */
//	private void renderText(StringBuffer ret, Node node, String value,
//			boolean editingNode, int index, boolean afterInsert)
//			throws XMLFacadeException
//	{
//		String className = data.getAttribute(node, "class");
//		if (className == null)
//			className = "";
//
//		if (!editingNode)
//		{
//
//			if (className.equals("indentedHeader"))
//			{
//				int idx = value.indexOf(':');
//				if (idx >= 0)
//				{
//					String heading = value.substring(0, idx);
//					String text = value.substring(idx + 1);
//
//					table(ret);
//					renderIndentedText(ret, text, heading);
//					closeTable(ret);
//				} else
//					tag(ret, value, className, "div");
//
//			} else
//			{
//				String tag = "div";
//				if (className.startsWith("heading"))
//				{
//					tag = "h" + className.substring(7);
//				}
//
//				tag(ret, value, className, tag);
//			}
//		} else
//		{
//			ret
//					.append("<textarea style='width:600px;height:300px' name='value'  >");
//
//			ret.append(encodeForTA(value));
//
//			ret.append("</textarea>");
//			ret.append(" Text Style: <select name='class' >");
//
//			renderOption(ret, className, TEXT);
//			renderOption(ret, className, "heading1");
//			renderOption(ret, className, "heading2");
//			renderOption(ret, className, "heading3");
//			renderOption(ret, className, "indentedHeader");
//			renderOption(ret, className, "intro");
//			renderOption(ret, className, "Editor");
//			renderOption(ret, className, "Discussion");
//			renderOption(ret, className, "DiscussionNoIndents");
//			renderOption(ret, className, "noPrint");
//			renderOption(ret, className, "conv");
//			renderOption(ret, className, "opt1");
//			renderOption(ret, className, "opt2");
//			renderOption(ret, className, "opt3");
//			// renderOption(ret, className, "import");
//
//			ret.append("</select>");
//
//			renderSaveCancel(ret, index, afterInsert);
//		}
//	}
//
//	private void tag(StringBuffer ret, String value, String className,
//			String tag)
//	{
//		ret.append("<" + tag + " class='");
//		ret.append(className);
//		ret.append("' >");
//		ret.append(encodeBasic(value).replaceAll("\n", "<br/>"));
//		ret.append("</" + tag + ">");
//	}
//
//	/**
//	 * @param ret
//	 * @param index
//	 */
//	private void renderSaveCancel(StringBuffer ret, int index,
//			boolean afterInsert)
//	{
//		ret.append("<div>");
//		// ret.append("<a href='#' onclick='document.forms[\"guide_edit_form\"].submit();return false;' >Save</a>");
//		ret.append("<a href='javascript:void(0)' onclick='saveEdit(\"" + index
//				+ "\"," + Boolean.toString(afterInsert)
//				+ ");return false;' >Save</a>");
//
//		// ret.append(" <a href='" + content.getUrlPath() + "?guide.page=" +
//		// getPageString() + "#guide.id." + index + "' >Cancel</a>");
//		ret
//				.append(" <a href='javascript:void(0)' onclick='cancelEdit();return false;' >Cancel</a>");
//		ret.append("</div>");
//	}
//
//	/**
//	 * @param ret
//	 * @param selectedVal
//	 * @param val
//	 */
//	private void renderOption(StringBuffer ret, String selectedVal,
//			String name, String val)
//	{
//
//		ret.append("<option value='" + encodeAttr(val) + "' "
//				+ (selectedVal.trim().equals(val) ? "selected" : "") + " >"
//				+ name + "</option>");
//	}
//
//	protected String getDataXml() throws Exception
//	{
//		return data.getXML();
//
//	}
//
//	/**
//	 * @param editIndex
//	 *            The editIndex to set.
//	 */
//	protected void setEditIndex(int editIndex)
//	{
//		this.editIndex = editIndex;
//	}
//
//	/**
//	 * @return Returns the editIndex.
//	 */
//	protected int getEditIndex()
//	{
//		return editIndex;
//	}
//
//	/**
//	 * @param id
//	 * @param type
//	 */
//	protected int insert(int id, String type) throws Exception
//	{
//		// Node node = data.findNode("guide/*[" + (id+2) + "]");
//
//		List nodes = getNodes();
//		if (id >= nodes.size())
//			id = nodes.size() - 1;
//
//		Node nodeBefore = (Node) getNodes().get(id);
//
//		Node nodeAfter = null;
//
//		if (nodeBefore != null)
//			nodeAfter = nodeBefore.getNextSibling();
//
//		Element newNode = data.getDocument().createElement(type);
//
//		if (nodeAfter != null)
//			data.findNode("guide").insertBefore(newNode, nodeAfter);
//		else
//			data.findNode("guide").appendChild(newNode);
//
//		data.setValue(newNode, ".", "");
//
//		if (type.equals(PROBLEM))
//		{
//			data.setAttribute(newNode, "grade", "V?");
//		}
//
//		data.setAttribute(newNode, "new", "true");
//
//		getNodes().add(newNode);
//		return getNodes().size() - 1;
//
//	}
//
//	/**
//	 * @param id
//	 */
//	protected void delete(int id) throws Exception
//	{
//		Node node = (Node) getNodes().get(id);
//		if (node != null)
//		{
//			getNodes().set(id, null);
//			data.removeNode(node);
//		}
//		// data.removeNode("guide/*[" + (id+1) + "]");
//
//	}
//
//	/**
//	 * @param id
//	 * @param request
//	 */
//	protected void edit(int id, HttpServletRequest request) throws Exception
//	{
//		// TODO: logging
//
//		// String nodePath = "guide/*[" + id + "]";
//		// Node node = data.findNode(nodePath);
//		// System.out.println(getList().getLength() );
//		Node node = (Node) getNodes().get(id);
//
//		String val = request.getParameter("value");
//		if (val == null)
//			val = "";
//
//		System.out.println("val:" + val);
//		// data.setValue(node,".",val);
//
//		String classVal = request.getParameter("class");
//
//		if ("conv".equals(classVal))
//		{
//			convert(id, val);
//		} else
//		{
//
//			if (!node.hasChildNodes())
//				node.appendChild(data.getDocument().createTextNode(val));
//			else
//				node.getFirstChild().setNodeValue(val);
//
//			setAttr(request, node, "src");
//			setAttr(request, node, "stars");
//			setAttr(request, node, "name");
//			setAttr(request, node, "number");
//			setAttr(request, node, "grade");
//			setAttr(request, node, "length");
//			setAttr(request, node, "extra");
//			setAttr(request, node, "class");
//			setAttr(request, node, "width");
//			setAttr(request, node, "noPrint");
//
//			String number = data.getAttribute(node, "number");
//			if (number != null && number.trim().length() > 0
//					&& !number.trim().endsWith(".") && !number.equals("null"))
//			{
//				number += ".";
//				data.setAttribute(node, "number", number);
//			}
//		}
//
//	}
//
//	/**
//	 * @param id
//	 * @param val
//	 */
//	protected void convert(int id, String val) throws Exception
//	{
//
//		if (val.indexOf("<guide") >= 0
//				&& val.indexOf("<div class=\"problem") > 0)
//		{
//			convertOldGuide(val);
//		}
//
//		if (val.startsWith(CLIMB))
//		{
//			convertClimb(val);
//		}
//
//	}
//
//	/**
//	 * @param val
//	 * @throws XMLFacadeException
//	 */
//	private void convertClimb(String val) throws XMLFacadeException
//	{
//		val += "\n";
//		String[] lines = val.split("\\n");
//		String current = "";
//		String firstLine = null;
//		String rest = "";
//		Pattern lenPattern = Pattern.compile("\\s[\\d~]+m\\s");
//
//		for (int i = 0; i < lines.length; i++)
//		{
//			String line = lines[i].trim();
//
//			if (line.length() > 0)
//			{
//				if (firstLine == null)
//					firstLine = line;
//				else
//					rest += line + "\n";
//
//				current += line + "\n";
//			} else
//			{
//				// empty line
//
//				if (current.length() > 0)
//				{
//					String name = null;
//					String grade = null;
//					String length = null;
//					String extra = null;
//					String stars = null;
//
//					String left = null;
//					String right = " " + firstLine + " ";
//
//					Matcher lenpat = lenPattern.matcher(right);
//					if (lenpat.find())
//					{
//						length = lenpat.group().trim();
//						left = " " + firstLine.substring(0, lenpat.start())
//								+ " ";
//						right = " " + firstLine.substring(lenpat.end()) + " ";
//					}
//
//					Pattern gradePat = Pattern.compile("\\s[\\d/?\\+]+\\s");
//					Matcher gradepat = gradePat.matcher(right);
//					if (gradepat.find())
//					{
//						grade = gradepat.group().trim();
//						extra = right.substring(gradepat.end()).trim();
//						if (left == null)
//							left = right.substring(0, gradepat.start()).trim();
//					}
//					if (grade != null)
//					{
//
//						Matcher starspat = Pattern.compile("\\s[\\\\*]+\\s")
//								.matcher(" " + left + " ");
//						if (starspat.find())
//							stars = starspat.group();
//
//						name = left.replaceAll("\\*", "").trim();
//
//						Node climb = data
//								.createNode("guide/climb", rest.trim());
//
//						if (name != null)
//							data.setAttribute(climb, "name", name);
//
//						if (grade != null)
//							data.setAttribute(climb, "grade", grade);
//
//						if (length != null)
//							data.setAttribute(climb, "length", length);
//
//						if (stars != null)
//							data.setAttribute(climb, "stars", stars);
//
//						if (extra != null)
//							data.setAttribute(climb, "extra", extra);
//					} else
//					{
//						Node text = data.createNode("guide/text", current
//								.trim());
//						data.setAttribute(text, "class", TEXT);
//					}
//
//					current = "";
//					firstLine = null;
//					rest = "";
//				}
//			}
//		}
//
//	}
//
//	/**
//	 * @param val
//	 */
//	protected void convertOldGuide(String val) throws Exception
//	{
//		XMLFacade guide = new XMLFacade(val);
//
//		data.removeNodes("guide/*");
//		Node guideNode = data.findNode("guide");
//
//		NodeList divlist = guide.findNodes("guide/div");
//
//		for (int i = 0; i < divlist.getLength(); i++)
//		{
//			Node div = divlist.item(i);
//			String type = guide.getAttribute(div, "class");
//			if (type.equals(PROBLEM))
//			{
//				Node newProb = data.createNode(guideNode, PROBLEM, guide
//						.getValue(div, "div[@class='problemDesc']"));
//				data.addAttribute(newProb, "number", guide.getValue(div,
//						"div[@class='problemHead']/span[@class='number']"));
//				data.addAttribute(newProb, "stars", guide.getValue(div,
//						"div[@class='problemHead']/span[@class='stars']"));
//				data.addAttribute(newProb, "name", guide.getValue(div,
//						"div[@class='problemHead']/span[@class='name']"));
//				data.addAttribute(newProb, "grade", guide.getValue(div,
//						"div[@class='problemHead']/span[@class='grade']"));
//				data.addAttribute(newProb, "extra", guide.getValue(div,
//						"div[@class='problemHead']/span[@class='start']"));
//			} else if (type.equals("img"))
//			{
//				Node newImg = data.createNode(guideNode, IMAGE, "");
//				String src = guide.getAttribute(guide.findNode(div, "img"),
//						"src");
//				src = src.substring(4);
//				data.addAttribute(newImg, "src", src);
//
//			} else
//			{
//				Node newText = data.createNode(guideNode, TEXT, guide
//						.getValue(div));
//				data.setAttribute(newText, "class", type);
//			}
//
//		}
//
//	}
//
//	protected void renderWiki(StringBuffer ret, String wikiText)
//	{
//
//		// logger.debug(parameter);
//		// logger.debug(parameter.getContext());
//		// logger.debug(parameter.getContext().getRenderEngine());
//		// ret.append(
//		// parameter.getContext().getRenderEngine().render(wikiText,parameter.getContext())
//		// ) ;
//
//		ret.append(subRenderer.render(wikiText, renderContext));
//
//	}
//
//	/**
//	 * @param request
//	 * @param node
//	 * @param attr
//	 * @throws XMLFacadeException
//	 */
//	private void setAttr(HttpServletRequest request, Node node, String attr)
//			throws XMLFacadeException
//	{
//		if (request.getParameter(attr) != null)
//		{
//			String val = request.getParameter(attr).trim();
//			if (val.equals("null"))
//				val = "";
//
//			data.setAttribute(node, attr, val);
//		}
//	}
//
//	protected void setAttr(Node node, String name, String val)
//	{
//		if (name != null && val != null && !val.equals("null"))
//			try
//			{
//				data.setAttribute(node, name, val);
//			} catch (XMLFacadeException e)
//			{
//				logger.error("Error setting attr: " + name + ":" + val, e);
//				throw new RuntimeException("Error setting attr: " + name + ":"
//						+ val, e);
//			}
//	}
//
//	public static void main(String[] args) throws Exception
//	{
//		// Guide guide = new Guide(null,"",null,null);
//		// guide.convertClimb()
//	}
//
//	/**
//	 * @return Returns the page.
//	 */
//	protected int getPage()
//	{
//		return page;
//	}
//
//	/**
//	 * @param page
//	 *            The page to set.
//	 */
//	protected void setPage(int page)
//	{
//		this.page = page;
//	}
//
//	/**
//	 * @return Returns the nodes.
//	 */
//	protected List<Element> getNodes()
//	{
//		if (nodes == null)
//		{
//			nodes = data.selectNodes("//guide/*");
//
//			// nodes = new ArrayList();
//			// NodeList nl = getList();
//			// for (int i=0;i<nl.getLength();i++)
//			// {
//			// nodes.add( nl.item(i) );
//			// }
//		}
//		return nodes;
//	}
//
//	/**
//	 * @param nodes
//	 *            The nodes to set.
//	 */
//	protected void setNodes(List nodes)
//	{
//		this.nodes = nodes;
//	}
//
//	protected void removeNewNodes()
//	{
//		try
//		{
//			data.removeNodes("guide/*[new='true']");
//		} catch (Exception e)
//		{
//			logger.error("Could not remove new nodes", e);
//			throw new RuntimeException("Could not remove new nodes", e);
//		}
//	}
//
//	/**
//	 * @return Returns the content.
//	 */
//	protected ContentEntityObject getContent()
//	{
//		return content;
//	}
//
//	public String edit(String id)
//	{
//		try
//		{
//			// return "edit this!";
//			logger.debug("edit: " + id);
//
//			refreshContentObject();
//
//			int index = Integer.parseInt(id);
//			setEditIndex(index);
//			StringBuffer ret = new StringBuffer();
//
//			renderNode(ret, false, false, false, false, index);
//
//			return ret.toString();
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error editing node", e);
//			throw new RuntimeException("Error editing node", e);
//		}
//
//	}
//
//	public void remove(String id)
//	{
//		try
//		{
//			logger.debug("remove: " + id);
//			int index = Integer.parseInt(id);
//
//			// pageManager.getPage(contentObject.getId()).get;
//			refreshContentObject();
//
//			delete(index);
//
//			guideMacro.saveGuide(this);
//		} catch (Exception e)
//		{
//			logger.error("Error removing node", e);
//			throw new RuntimeException("Error removing node", e);
//		}
//	}
//
//	public String insert(String id, String type)
//	{
//		try
//		{
//
//			int index = Integer.parseInt(id);
//			logger.debug("insert: " + id);
//
//			refreshContentObject();
//
//			int newIndex = this.insert(index, type);
//			this.setEditIndex(newIndex);
//
//			// saveGuide();
//
//			StringBuffer sb = new StringBuffer();
//
//			this.renderNode(sb, false, true, true, false, newIndex);
//
//			String html = sb.toString();
//
//			// String[] ret = new String[] { html,Integer.toString(newIndex) };
//			return html;
//
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error inserting node", e);
//			throw new RuntimeException("Error inserting node", e);
//		}
//	}
//
//	public String save(String sid, boolean afterInsert,
//			HashMap<String, String> map)
//	{
//
//		// String value,String clazz,String src,String stars,String name,String
//		// number,String grade,String length,String extra,String width, String
//		// noPrint
//
//		try
//		{
//			String type = map.get("guide.type");
//
//			int id = Integer.parseInt(sid);
//			System.out.println("save: " + sid + "," + map);
//
//			Node node = (Node) this.getNodes().get(id);
//
//			String value = map.get("value");
//			if (value == null)
//				value = "";
//
//			if ("conv".equals(map.get("clazz")))
//			{
//				this.convert(id, value);
//			} else if ("gps".equals(type))
//			{
//				// remove existing children
//				NodeList nl = node.getChildNodes();
//
//				for (int i = nl.getLength() - 1; i >= 0; i--)
//					node.removeChild(nl.item(i));
//
//				int current = 0;
//
//				String code = null;
//
//				while ((code = map.get("code" + current)) != null)
//				{
//					code = code.trim();
//					if (code.length() > 0)
//					{
//
//						Node child = data.createNode(node, "point", "");
//
//						setAttr(child, "code", code);
//						setAttr(child, "description", map.get("description"
//								+ current));
//						setAttr(child, "zone", map.get("zone" + current));
//
//						setIntAttr(map, current, child, "easting");
//						setIntAttr(map, current, child, "northing");
//						setIntAttr(map, current, child, "height");
//
//					}
//
//					current++;
//
//				}
//			} else
//			{
//
//				if (!node.hasChildNodes())
//					node.appendChild(this.data.getDocument().createTextNode(
//							value));
//				else
//					node.getFirstChild().setNodeValue(value);
//
//				for (Entry<String, String> e : map.entrySet())
//				{
//					String key = e.getKey();
//					String val = e.getValue();
//
//					if (key.equals("number"))
//					{
//						if (val != null && val.trim().length() > 0
//								&& !val.trim().endsWith("."))
//						{
//							val += ".";
//
//						}
//
//					}
//
//					if (val == null || val.equals("null"))
//						val = "";
//
//					if (key.equals("clazz"))
//						key = "class";
//
//					if (key.equals("len"))
//						key = "length";
//
//					boolean g = key.startsWith("guide.");
//
//					if (!g && !key.equals("value"))
//					{
//						val = val.replaceAll(Pattern.quote("\n"), "<br/>");
//
//						this.setAttr(node, key, val.trim());
//					}
//				}
//
//				// this.setAttr(node,"src",src);
//				// this.setAttr(node,"stars",stars);
//				// this.setAttr(node,"name",name);
//				// this.setAttr(node,"number",number);
//				// this.setAttr(node,"grade",grade);
//				// this.setAttr(node,"length",length);
//				// this.setAttr(node,"extra",extra);
//				// this.setAttr(node,"class",clazz);
//				// this.setAttr(node,"width",width);
//				// this.setAttr(node,"noPrint",noPrint);
//
//				this.setAttr(node, "new", "false");
//
//			}
//
//			refreshContentObject();
//
//			this.removeNewNodes();
//
//			guideMacro.saveGuide(this);
//
//			this.setEditIndex(-1);
//
//			StringBuffer sb = new StringBuffer();
//
//			this.renderNode(sb, true, afterInsert, afterInsert, !afterInsert,
//					id);
//
//			String html = sb.toString();
//
//			return html;
//
//		} catch (Exception e)
//		{
//			e.printStackTrace();
//			logger.error("Error inserting node", e);
//			throw new RuntimeException("Error inserting node", e);
//		}
//	}
//
//	private void setIntAttr(HashMap<String, String> map, int current,
//			Node child, String field)
//	{
//		String val = map.get(field + current);
//		val = val.replaceAll("[^\\d]", "");
//		val = val = val.trim();
//		setAttr(child, field, val);
//	}
//
//	private void refreshContentObject()
//	{
//		if (content != null)
//		{
//			content = guideMacro.getPageManager().getById(content.getId());
//		}
//	}

}
