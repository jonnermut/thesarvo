package com.thesarvo.confluence;

import java.io.StringReader;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.httpclient.util.URIUtil;
import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;
import org.dom4j.Node;
import org.dom4j.io.OutputFormat;
import org.dom4j.io.SAXReader;
import org.dom4j.io.XMLWriter;

import com.atlassian.confluence.core.BodyContent;
import com.atlassian.confluence.core.BodyType;
import com.atlassian.confluence.core.DefaultSaveContext;
import com.atlassian.confluence.core.Modification;
import com.atlassian.confluence.core.SaveContext;
import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.google.gson.Gson;

public class Service
{
	static Logger logger = Logger.getLogger(Service.class);
	
	
	public static Page getPage(String pageId)
	{
		PageManager pm = getPageManager();

		Page p = pm.getPage(Long.parseLong(pageId.trim()));
		return p;
	}

	public static PageManager getPageManager()
	{
		PageManager pm = (PageManager) com.atlassian.spring.container.ContainerManager
				.getComponent("pageManager");
		return pm;
	}

	public static Document getGuideXml(Page p)
	{
		Document doc = parse(getGuideString(p));
		return doc;
	}

//	public static org.jdom.Document getGuideXml(Page p)
//	{
//		org.jdom.Document doc = parseXml(getGuideString(p));
//		return doc;
//	}
	
	public static boolean hasGuide(Page p)
	{
		if (p == null)
			return false;
		
		String content = p.getBodyAsString();
		return content != null && content.indexOf("<guide") >= 0;
		
	}
	
	public static String getGuideString(Page p)
	{
		if (p == null)
			return null;
		
		String content = p.getBodyAsString();
		if (content != null && content.indexOf("<guide") >= 0)
		{
			
			int start = content.indexOf(Service.GUIDE_MACRO);
			
			if (start >= 0)
			{
				start += Service.GUIDE_MACRO.length();
				int end = content.indexOf(Service.GUIDE_MACRO, start);
				if (end >= 0)
				{
					String xml = content.substring(start, end);
					return xml;
				}

			}
			else
			{
				start = content.indexOf("<guide");
				if (start >= 0)
				{
					int end = content.indexOf("</guide>", start);
					if (end >= 0)
					{
						String xml = content.substring(start, end + 8);
						return xml;
					}
				}
			}
		}

		return null;
	}


	public static Document parse(String xml)
	{
		if (xml==null)
			return null;
		
		SAXReader reader = new SAXReader();
		Document document;
		try
		{
			StringReader sr = new StringReader(xml);
			document = reader.read(sr);
		} 
		catch (DocumentException e)
		{
			logger.error("Could not parse xml:" + xml, e);
			//e.printStackTrace();
			throw new RuntimeException("Could not parse xml:" + xml, e);
		}
		return document;
	}
	
//	public static org.jdom.Document parseXml(String xml)
//	{
//		SAXBuilder builder = new SAXBuilder();
//		try
//		{
//			org.jdom.Document doc = builder.build(new StringReader(xml));
//			return doc;
//		}
//		catch (Exception e)
//		{
//			logger.error("Could not parse xml:" + xml, e);
//			//e.printStackTrace();
//			throw new RuntimeException("Could not parse xml:" + xml, e);
//		}
//	}

	@SuppressWarnings("unchecked")
	public static void saveGuide(Page p, String xml, final String user)
	{
		
		try
		{
			Document doc = parse(xml);
			
			if (doc != null)
			{
				// bit of a hack - get rid of spurious parseerror elements
				List<Element> pes = doc.getRootElement().elements("parseerror");
				for (Element e: pes)
					doc.getRootElement().remove(e);
				
				// parse and pretty print the xml
				OutputFormat format = OutputFormat.createPrettyPrint();
				StringWriter sw = new StringWriter();
			    XMLWriter writer = new XMLWriter( sw, format );
			    writer.write( doc );
			    writer.close();
			    xml = sw.toString();
			    xml = xml.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "");		    
			    xml = xml.substring(0, xml.indexOf("</guide>") + 8);
			    xml = xml.trim();
			}
		}
		catch (Throwable t)
		{
			logger.error("Error parsing saved xml", t);
			t.printStackTrace();
		}
		
		
		try
		{
		
			PageManager pm = getPageManager();
	
			
//			Page old=null;
//			try
//			{
//				old = (Page) p.clone();
//			} 
//			catch (CloneNotSupportedException e)
//			{
//				// TODO Auto-generated catch block
//				e.printStackTrace();
//				logger.error(e);
//			}
	
			String content = p.getBodyAsString();
	
			int start = content.indexOf("<guide") ;
			int end = content.indexOf("</guide>", start);
	
			String suffix = "";
	
			/*
			if (end < 0)
			{
				end = start;
				suffix = "\n {guide} \n";
			}*/
			
			if (start > -1 && end > -1)
			{
				end = end + 8;
	
				final String newContent = content.substring(0, start) + xml
						+ suffix + content.substring(end);
		
				Calendar c = new GregorianCalendar();
				c.setTime(p.getLastModificationDate());
		
				//BodyContent bc = p.getBodyContent(BodyType.XHTML);
				//bc.setBody(newContent);
				
				//p.setContent(newContent);
				
				
				SaveContext sc = new DefaultSaveContext();
				

		
				logger.debug("saving now");
				boolean minor = c.get(Calendar.DAY_OF_YEAR) == new GregorianCalendar()
						.get(Calendar.DAY_OF_YEAR) && user!=null && user.equals(p.getLastModifierName());
				sc.setMinorEdit(minor);
				
				if (minor)
				{
					p.setBodyAsString(newContent);
					p.setLastModificationDate(new Date());
					p.setLastModifierName(user);
					p.setVersionComment("Guide edited");
					pm.saveContentEntity(p, sc);
				}
				else
				{
					 pm.<Page>saveNewVersion(p, new Modification<Page>() 
					{
					      public void modify(Page page) 
					      {
					    	  page.setBodyAsString(newContent);
					    	  page.setLastModificationDate(new Date());
					    	  page.setLastModifierName(user);
					    	  page.setVersionComment("Guide edited");
					    	  
					      }
					 });
				}
			}
		}
		catch (Throwable t)
		{
			logger.error("Error saving guide", t);
			t.printStackTrace();
		}
	}

	public static Document getAttachments(String id)
	{
		Page p = Service.getPage(id);
		Document doc = DocumentHelper.createDocument();
		Element el = DocumentHelper.createElement("attachments");
		doc.add( el );
		
		SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd HHmm");
		
		for (Attachment att : p.getAttachments())
		{
			if (att != null)
			{
				Element atel = DocumentHelper.createElement("attachment");
				el.add(atel);
				atel.setText(att.getFileName());
				atel.addAttribute("version", Integer.toString( att.getVersion() ));
				
				if (att.getLastModificationDate() != null)
					atel.addAttribute("lastModificationDate",sdf.format( att.getLastModificationDate() ));
			}
		}
		return doc;
	}

	static final String GUIDE_MACRO = "{guide}";

	static final String BASE_URL = "http://www.thesarvo.com/confluence/";

	private static final long CACHE_INTERVAL = 10 * 60 * 1000; // 10 minute cache
	
	static long maxLastMod = 0;
	static long maxLastModSetTime = 0;

	@SuppressWarnings("unchecked")
	public static Document getSync(long since) 
	{
		PageManager pm = getPageManager();
		
		Page root = getRootPage();
		
		if (root == null)
		{
			throw new RuntimeException("Could not find root page");
		}
		
		Document doc = DocumentHelper.createDocument();
		Element updates = DocumentHelper.createElement("updates");
		doc.add( updates );
		
		long now = new Date().getTime();
		
		if (maxLastMod > 0)
		{		
			if (now - maxLastModSetTime < CACHE_INTERVAL)
			{
				if (since >= maxLastMod)
				{
					// bail out if our cached max last modified is less than the since
					
					updates.addAttribute("maxLastMod", "" + maxLastMod);
					return doc;
				}
			}
			else
			{
				maxLastMod = 0; // reset cache
			}
		}
		
		String indexJson = getIndexJson();
		String hash = DigestUtils.shaHex(indexJson);
		updates.addAttribute("indexHash", hash);
		
		@SuppressWarnings("unchecked")
		List<Page> pages = pm.getDescendents(root);
		
		for (Page page : pages)
		{
			long lastUpdate = page.getLastModificationDate().getTime();
			
			if (lastUpdate > maxLastMod)
				maxLastMod = lastUpdate;
			
			if (lastUpdate > since)
			{
				if (!hasGuide(page))
				{
					continue;
				}
				
				String url = BASE_URL + "plugins/servlet/guide/xml/" + page.getId();
				String idStr = "" + page.getId();
				String filename = idStr + ".xml";
				
				addUpdate(updates, lastUpdate, url, filename);
				
				Document guidexml = null;
				List<Element> imageNodes = null;
				
				for (Attachment att : page.getLatestVersionsOfAttachments())
				{
					if (att != null && att.getLastModificationDate() != null)
					{
						long lastUpdate1 = att.getLastModificationDate().getTime();
						
						if (lastUpdate1 > maxLastMod)
							maxLastMod = lastUpdate1;
						
						if (lastUpdate1 > since)
						{
							// double check that this attachment is referenced in the guide xml
							
							if (guidexml == null)
							{
								guidexml = getGuideXml(page);
								if (guidexml != null)
								{
									imageNodes = guidexml.selectNodes("//image");
								}
							}
							
							if (imageNodes != null)
							{
								for (Element e : imageNodes)
								{
									String attFilename = att.getFileName();
									if (attFilename.equals( e.attributeValue("src") ))
									{
										// match
										String width = e.attributeValue("width");
										boolean hasWidth = width != null && width.trim().length() > 0;
										
										String mainFilename = idStr + "-" + attFilename.toLowerCase();
										String thumbFilename = idStr + "-t-" + attFilename.toLowerCase();
										
										String escapedFilename = attFilename;
										try 
										{
											escapedFilename = URLEncoder.encode(attFilename, "UTF-8");
										} 
										catch (UnsupportedEncodingException e1) 
										{
											// TODO Auto-generated catch block
											e1.printStackTrace();
										}
										String mainUrl = BASE_URL + "plugins/servlet/guide/image/" + idStr + "/" + escapedFilename + ( hasWidth ? "?width=" + width : "");
										String thumbUrl = BASE_URL + "download/thumbnails/" + idStr + "/" + escapedFilename;
										
										addUpdate(updates, lastUpdate1, mainUrl, mainFilename);
										addUpdate(updates, lastUpdate1, thumbUrl, thumbFilename);
										
										break;
									}
								}
							}
							
						}
					}

				}
				
			}
		}
		
		maxLastModSetTime = now;
		updates.addAttribute("maxLastMod", "" + maxLastMod);
		
		return doc;
		
	}

	private static Page getRootPage() 
	{
		long rootId = 414; // thesarvo.com root of all climbing guides
		
		PageManager pm2 = getPageManager();
		
		Page root = pm2.getPage(rootId);
		return root;
	}
	
	static String indexJson;
	static Long indexJsonUpdated;
	
	public static String getIndexJson()
	{
		Page root = getRootPage();
		
		if (indexJsonUpdated == null || indexJsonUpdated < (System.currentTimeMillis() * 60000) )
		{	
			Map<String, Object> index = doPage(root);
			Gson gson = new Gson();
			indexJson = gson.toJson(index); 
			indexJsonUpdated = System.currentTimeMillis();
		}
		return indexJson;
	}
	
	private static Map<String, Object> doPage(Page page) 
	{
		Map<String, Object> index = new LinkedHashMap<String, Object>();
		index.put("id", page.getId());
		index.put("title", page.getTitle());
		String url = "http://www.thesarvo.com/confluence" + page.getUrlPath();
		index.put("url", url);
		ArrayList<Object> kidArray = new ArrayList<Object>();
		index.put("children", kidArray);
		for (Page kid : page.getSortedChildren())
		{
			Map<String, Object> kidMap = doPage(kid);
			kidArray.add(kidMap);
		}
		return index;
	}

	private static void addIndexUpdate(Page root, Element updates)
	{
		
	}
	
	

	private static void addUpdate(Element updates, long lastUpdate, String url, String filename) {
		Element update = DocumentHelper.createElement("update");
		update.addAttribute("url", url);
		update.addAttribute("lastModified", "" + lastUpdate);
		update.addAttribute("filename", filename);
		updates.add(update);
	}

}
