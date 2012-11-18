package com.thesarvo.confluence;

import java.io.StringReader;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;

import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;
import org.dom4j.io.OutputFormat;
import org.dom4j.io.SAXReader;
import org.dom4j.io.XMLWriter;

import com.atlassian.confluence.core.BodyContent;
import com.atlassian.confluence.core.BodyType;
import com.atlassian.confluence.core.DefaultSaveContext;
import com.atlassian.confluence.core.SaveContext;
import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;

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
	
	public static String getGuideString(Page p)
	{
		String content = p.getBodyAsString();
		if (content != null && content.indexOf("<guide>") >= 0)
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
				start = content.indexOf("<guide>");
				int end = content.indexOf("</guide>", start);
				if (end >= 0)
				{
					String xml = content.substring(start, end + 8);
					return xml;
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

	public static void saveGuide(Page p, String xml, String user)
	{
		/*
		try
		{
			Document doc = parse(xml);
			OutputFormat format = OutputFormat.createPrettyPrint();
			StringWriter sw = new StringWriter();
		    XMLWriter writer = new XMLWriter( sw, format );
		    writer.write( doc );
		    writer.close();
		    xml = sw.toString();
		    xml = xml.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "");
		    xml = xml.trim();
		    xml = xml.substring(0, xml.indexOf("</guide>") + 8);
		}
		catch (Exception e)
		{
			
		}
		*/
		
		
		PageManager pm = getPageManager();

		
		Page old=null;
		try
		{
			old = (Page) p.clone();
		} 
		catch (CloneNotSupportedException e)
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
			logger.error(e);
		}

		String content = p.getBodyAsString();

		int start = content.indexOf("<guide>") ;
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

			String newContent = content.substring(0, start) + xml
					+ suffix + content.substring(end);
	
			Calendar c = new GregorianCalendar();
			c.setTime(old.getLastModificationDate());
	
			//BodyContent bc = p.getBodyContent(BodyType.XHTML);
			//bc.setBody(newContent);
			
			//p.setContent(newContent);
			p.setBodyAsString(newContent);
			
			SaveContext sc = new DefaultSaveContext();
			sc.setMinorEdit(true);
			p.setLastModificationDate(new Date());
			p.setLastModifierName(user);
	
			logger.debug("saving now");
			if (c.get(Calendar.DAY_OF_YEAR) == new GregorianCalendar()
					.get(Calendar.DAY_OF_YEAR) && user!=null && user.equals(old.getLastModifierName()))
			{
				pm.saveContentEntity(p, sc);
			}
			else
			{
				pm.saveContentEntity(p, old, sc);
			}
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
			Element atel = DocumentHelper.createElement("attachment");
			el.add(atel);
			atel.setText(att.getFileName());
			atel.addAttribute("version", Integer.toString( att.getVersion() ));
			
			atel.addAttribute("lastModificationDate",sdf.format( att.getLastModificationDate() ));
		}
		return doc;
	}

	static final String GUIDE_MACRO = "{guide}";

}
