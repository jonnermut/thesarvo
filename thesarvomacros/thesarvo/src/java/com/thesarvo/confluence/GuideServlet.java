package com.thesarvo.confluence;

import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.Element;

import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.Page;

public class GuideServlet extends HttpServlet
{
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Logger for this class
	 */
	private static final Logger logger = Logger.getLogger(GuideServlet.class);

	
	@Override
	public void init() throws ServletException
	{
		super.init();
		
//		BannerGrabber current = (BannerGrabber) this.getServletContext().getAttribute("guide.bannerGrabber");
//		if (current!=null)
//		{
//			logger.warn("Stopping current bannerGrabber");
//			current.stop();
//		}
//		current = new BannerGrabber();
//		
//		logger.warn("Starting bannerGrabber");
//		current.start();
//		this.getServletContext().setAttribute("guide.bannerGrabber", current);
	}
	
	@Override
	protected void service(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException
	{
		String method = req.getMethod();
		String url = req.getPathInfo();
		
		int idx = url.indexOf("?");
		if (idx > -1)
			url = url.substring(0,idx);
		
		
		if (url.startsWith("/"))
			url = url.substring(1);
		
		String[] spliturl = url.split("/");
		String id = spliturl[1];
		String action = spliturl[0];
		
		String user = req.getParameter("user");
		
		System.out.println("action=" + action + " id=" + id + " user=" + user);
		
		if (action.equals("xml"))
		{
			
			handleXml(req, resp, method, id, user);
		}
		else if (action.equals("attachments"))
		{
			Document doc = Service.getAttachments(id);
			resp.getWriter().write( doc.asXML() );
		}
		else if (action.equals("image"))
		{
			String src = spliturl[2];
			String width = req.getParameter("width");
			
			Page p = Service.getPage(id);
			Attachment att = p.getAttachmentNamed(src);
			att = (Attachment) att.getLatestVersion();
			InputStream is = att.getContentsAsStream();
			BufferedImage img = ImageIO.read(is);

			if (width!=null && width.length() > 0)
			{
				int w = Integer.valueOf(width);
				Image img2 = img.getScaledInstance(w, -1, java.awt.Image.SCALE_AREA_AVERAGING);
				//img = (BufferedImage) img2;
				BufferedImage img3 = new BufferedImage(img2.getWidth(null), img2.getHeight(null), BufferedImage.TYPE_INT_RGB);
				//img2.getGraphics().drawImage(img3, 0, 0, null);
				img3.getGraphics().drawImage(img2, 0, 0, null);
				img = img3;
				
				// http://www.exampledepot.com/egs/javax.imageio/JpegWrite.html
				// http://forums.sun.com/thread.jspa?threadID=5366557
			}
			
			String outf = "jpg";
			if (src.toLowerCase().contains("png"))
			{
				outf = "png";
				ImageIO.write(img, outf, resp.getOutputStream());
			}
			else
			{
				
				Iterator writers = ImageIO.getImageWritersByFormatName( "jpg" );
				// Fetch the first writer in the list
				ImageWriter imageWriter = (ImageWriter) writers.next();
					
				ImageWriteParam params = imageWriter.getDefaultWriteParam();
				// Define compression mode
				params.setCompressionMode( javax.imageio.ImageWriteParam.MODE_EXPLICIT );
				// Define compression quality
				params.setCompressionQuality( 0.9F );
				
				
				ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream( resp.getOutputStream() );
				imageWriter.setOutput( imageOutputStream );

				imageWriter.write( null, new IIOImage( img, null, null ), params );
				
				//ImageIO.write(img, outf, resp.getOutputStream());
			}
		}
			
		
	}

	private void handleXml(HttpServletRequest req, HttpServletResponse resp,
			String method, String id, String user) throws IOException
	{
		Page p = Service.getPage(id);
		
		if (method.equals("GET"))
		{
			boolean includeSurrounding = req.getParameter("includeSurrounding") != null; 
			
			if (!includeSurrounding)
			{
				String xml = Service.getGuideString(p);
				resp.getWriter().write(xml);
			}
			else
			{
				Document doc = Service.getGuideXml(p);
				Page parent = p.getParent();
				java.util.List<Page> siblings = parent.getSortedChildren();
				int idx = siblings.indexOf(p);
				String xml = doc.getRootElement().asXML();
				if (idx > 0)
				{
					
					Document d2 = Service.getGuideXml( siblings.get(idx-1) );
					xml = d2.getRootElement().asXML() + xml;
				
				}
				if (idx < siblings.size() - 1)
				{
					Document d2 = Service.getGuideXml( siblings.get(idx+1) );

					xml += d2.getRootElement().asXML();
				}
				
				resp.getWriter().write("<guide>" + xml + "</guide>");
			}
		}
		else if (method.equals("POST"))
		{
			StringBuffer data = new StringBuffer();
			
			while (true)
			{
				String line = req.getReader().readLine();
				if (line==null)
					break;
				data.append(line);
				data.append("\n");
			}
			String d = data.toString();
			System.out.println("data=" + d);
			
			Service.saveGuide(p, d, user);
		}
	}

	private int addEls(Document doc, Document d2, int i)
	{
		for (Element el : (List<Element>) d2.getRootElement().elements())
		{
			if (i >= doc.getRootElement().elements().size())
				doc.getRootElement().elements().add(el.clone());
			else
				doc.getRootElement().elements().add(i, el);
			i++;
		}
		return i;
	}
}
