package com.thesarvo.confluence;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpUtils;

import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;
import org.dom4j.Node;

import com.atlassian.confluence.pages.Page;

public class KmlServlet extends HttpServlet
{

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	/**
	 * Logger for this class
	 */
	private static final Logger logger = Logger.getLogger(KmlServlet.class);

	public static void main(String[] args) throws Exception
	{
		Document d = getBaseXml();
		handleKml(d, "<?xml version='1.0' encoding='UTF-8'?><kml xmlns='http://www.opengis.net/kml/2.2' xmlns:gx='http://www.google.com/kml/ext/2.2' xmlns:kml='http://www.opengis.net/kml/2.2' xmlns:atom='http://www.w3.org/2005/Atom'><Document><name>Lost World</name><open>1</open><Style id='sn_ylw-pushpin0'><LineStyle><color>7f0000ff</color><width>6</width></LineStyle></Style></Document></kml>");
		
		System.out.println(d.asXML());
		
		System.out.println( getData(null) );
	}
	
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException 
	{
		try
		{
			logger.warn("KmlServlet url=" +  HttpUtils.getRequestURL(req) );
			
			String pageId = req.getParameter("pageId");
			
			String recursive = req.getParameter("recursive");
			
			String data = getData(pageId);
			
			logger.warn("KmlServlet data=" +  data );
			resp.setContentType("application/vnd.google-earth.kml+xml");
			resp.getWriter().write(data);
		}
		catch (Exception e)
		{
			logger.error("Error getting kml",e);
			throw new ServletException(e);
		}
		
	}

	private static String getData(String pageId) throws DocumentException
	{
		Document doc = getBaseXml();
		
		Element document = getDocumentEl(doc);
		
		if (pageId==null || pageId.length()==0)
		{
			// test data
			Point example = new Point("EX","Example point Bellerive boulder",531523, 5253606, 0);
			renderPoint(doc, example);
		}
		else
		{
			Page p = Service.getPage(pageId);
			
			List<Point> points = new ArrayList<Point> (); 
				
			getGpsPoints(points, p, true, doc);
										
			for (Point point : points)
			{
				renderPoint(doc, point);
			}
			
		}
		
		//out.append("</Document></kml>");
		
		
		
		
		//resp.setContentType("text/xml");
		
		
		//String data = out.toString();
		
		String data = doc.asXML();
		return data;
	}

	private static Document getBaseXml() throws DocumentException
	{
		StringBuffer out = new StringBuffer();
		
		out.append("<?xml version='1.0' encoding='UTF-8'?><kml xmlns='http://www.opengis.net/kml/2.2'>")
			.append("<Document><name>thesarvo.com Tasmanian Climbing</name><description><![CDATA[Locations of climbing and bouldering areas in Tasmania, Australia.]]></description>")
			.append("<Style id='style1'><IconStyle><Icon>")
			.append("<href>http://maps.google.com/mapfiles/ms/icons/blue-dot.png</href>")
			.append("</Icon></IconStyle></Style></Document></kml>");
		
		Document doc = DocumentHelper.parseText(out.toString());
		return doc;
	}

	private static void renderPoint(Document doc, Point point)
	{
		
		
//		doc.append("\n<Placemark><name>")
//			.append( Encode.xmlEncode(point.getCode()) )
//			.append("</name>")
//			.append("<description><![CDATA[")
//			.append( Encode.xmlEncode(point.getDescription() )  );
//			
//		if (point.getUrl() !=null)
//		{
//			doc.append(" <br><a href='" + point.getUrl() + "'>" + point.getUrlName() + "</a>" );
//		}
//		
//		doc.append("]]></description>")
//			.append("<styleUrl>#style1</styleUrl>");
//			
			
		Element document = getDocumentEl(doc);
		
		Element placemark = document.addElement("Placemark");
		placemark.addElement("name").setText( point.getCode());
		
		String desc = point.getDescription();
		if (point.getUrl() !=null)
		{
			desc += " <br/><a href='" + point.getUrl() + "'>" + point.getUrlName() + "</a>" ;
		}
		
		placemark.addElement("description").setText( desc);
		placemark.addElement("styleUrl").setText( "#style1");
		
		double[] coord = getLatLong(point);
		
		//System.out.println(coord[1]);
		//System.out.println(coord[0]);
		
//		doc.append("\n<Point>")
//			.append("<coordinates>")
//			
//			.append(coord[1])
//			.append(",")
//			.append(coord[0])
//			.append(",")
//			.append(point.getHeight())
//			.append("</coordinates>")
//			.append("</Point>\n")
//			.append("</Placemark>");
			
		Element p = placemark.addElement("Point");
		String c = coord[1] + "," + coord[0] + "," + point.getHeight();
		p.addElement("coordinates").setText( c);
		
	}

	private static Element getDocumentEl(Document doc)
	{
		return (Element) doc.getRootElement().element("Document");
	}

	public static double[] getLatLong(Point point)
	{
		CoordinateConversion cc = new CoordinateConversion();	
		double[] coord = cc.utm2LatLon(55, "G", point.getEasting(), point.getNorthing());
		return coord;
	}
	
	

	private static void getPointListFromNodes(List<Node> nl,
			List<Point> points, Page page)
	{
		String url = "http://www.thesarvo.com/confluence" + page.getUrlPath();

		for (Node n: nl)
		{
			Point p = new Point(n);

			p.setUrl(url);
			p.setUrlName(page.getTitle());

			points.add(p);
		}
	}
	
	
	public static void getGpsPoints(List<Point> points, Page p, boolean recursive, Document output)
	{
		try
		{
			
			
			Document doc = Service.getGuideXml(p);
			if (doc!=null)
			{
			
				List<Node> nl = doc.selectNodes("//point");
				
				//NodeList nl = xmlData.findNodes("//point");
				
				getPointListFromNodes(nl, points, p);
				
				
				Element gps = (Element) doc.selectSingleNode("//gps");
				if (gps!=null)
				{
					String kml = gps.attributeValue("kml");
					if (kml != null && kml.trim().length() > 0)
					{
						handleKml(output, kml);
					}
				}
			}
			
			{
				for (Page child : (List<Page>) p.getChildren())
				{
					getGpsPoints(points, child,recursive, output);
				}
			}
		}
		catch (Exception e)
		{
			//e.printStackTrace();
			logger.error("Error getting gps points",e);
			throw new RuntimeException("Error getting gps points",e);
		}
		
	}

	private static void handleKml(Document output, String kml)
	{
		try
		{
			Document kmlDoc = DocumentHelper.parseText(kml.trim());
			
			
			Element outputDocNode = getDocumentEl(output);
			
			Element kmlDocNode = getDocumentEl(kmlDoc);
			if (kmlDocNode!=null)
			{
				List<Element> els = kmlDocNode.elements();
				if (els !=null)
				{
					for (Element e: els)
					{
						e.detach();
						outputDocNode.add(e);
					}
				}
			}
		}
		catch (Exception e)
		{
			logger.error("Error handling gps kml attribute, kml=" + kml, e);
		}
	}

}

