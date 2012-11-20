package com.thesarvo.confluence;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;

import com.atlassian.confluence.content.render.xhtml.ConversionContext;
import com.atlassian.confluence.core.ContentEntityObject;
import com.atlassian.confluence.core.ContentPropertyManager;
import com.atlassian.confluence.macro.Macro;
import com.atlassian.confluence.macro.MacroExecutionException;
import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.AttachmentManager;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.renderer.PageContext;
import com.atlassian.confluence.security.PermissionManager;
import com.atlassian.confluence.setup.BootstrapManager;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.renderer.RenderContext;
import com.atlassian.renderer.v2.SubRenderer;
import com.atlassian.renderer.v2.macro.MacroException;
import com.atlassian.renderer.v2.macro.ResourceAware;
import com.atlassian.renderer.v2.macro.basic.InlineHtmlMacro;
import com.atlassian.user.User;
import com.opensymphony.webwork.ServletActionContext;

/**
 *
 *
 */
public class GuideMacro extends InlineHtmlMacro implements ResourceAware, com.atlassian.plugin.StateAware, Macro
{

	/**
	 * Logger for this class
	 */
	private static final Logger logger = Logger.getLogger(GuideMacro.class);

	// TODO: caching

	private ContentPropertyManager contentPropertyManager;
	private PageManager pageManager;

	//private ContentEntityObject contentObject ;
	//private ContentEntityManager contentEntityManager;

	protected AttachmentManager attachmentManager;

	protected SubRenderer subRenderer;

	protected BootstrapManager bootstrapManager;

	protected PermissionManager permissionManager;
	
	protected String resourcePath;

	//private Guide guide;
	
	static BannerGrabber bannerGrabber;
		

    public void setAttachmentManager(AttachmentManager attachmentManager)
    {
        this.attachmentManager = attachmentManager;
    }



    public String execute(Map parameters2, String fullBody, RenderContext renderContext) throws MacroException
    {

    	logger.debug("execute");

        try
        {
        	String atPath = renderContext.getAttachmentsPath();
        	String baseUrl = renderContext.getBaseUrl();

        	String ret="";

            // retrieve a reference to the body object this macro is in
        	ContentEntityObject contentObject = ((PageContext)renderContext).getEntity();

        	User user = AuthenticatedUserThreadLocal.getUser();

        	// check if any request parameters came in to complete or uncomplete tasks
        	final HttpServletRequest request = ServletActionContext.getRequest();
        	String action = request.getParameter("guide.action");

	        if ( action != null)
	        {
	        	logger.debug("action=" + action);
	        	if (action.equals("showxml") )
	        	{
	        		
	        		String fullbody = Service.getGuideString((Page) contentObject);
	        		ret = "<!-- guide.xml.start " + fullBody + " guide.xml.end -->";
	        		//render = false;
	        		return ret;
	        	}
	        	if (action.equals("showattach"))
	        	{
	        		//XMLFacade attach = new XMLFacade();
	        		//Document attach = DocumentHelper.createDocument();
	                //Element attachmentsNode = attach.addElement( "attachments" );
	        		
	        		Document doc = DocumentHelper.createDocument();
	        		Element el = DocumentHelper.createElement("attachments");
	        		doc.add( el );

	        		
	        		//Node attachmentsNode = attach.createNode("attachments","");
	    			List atlist = contentObject.getLatestVersionsOfAttachments();
	    			for (int n=0;n<atlist.size();n++)
	    			{
	    				Attachment at = (Attachment) atlist.get(n);
	    				
	    				SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
	    				String modDate = sdf.format( at.getLastModificationDate() );	        		        
	
	    		        Element attachmentNode = el.addElement( "attachment" )
	    		            .addAttribute( "filename", at.getFileName() )
	    		            .addAttribute( "url", at.getDownloadPath() )
	    		            .addAttribute( "version", at.getAttachmentVersion().toString() )
	    		            .addAttribute( "modificationDate", modDate );
	    		            
	    			}
	    			ret = "<!-- guide.xml.start " + doc.asXML() + " guide.xml.end -->";
	        		//render = false;
	    			return ret;
	        	}
	        	return "action?";
	        }
	        else
	        {
	        	
	        	StringBuilder out = new StringBuilder();
	        	out.append("<script  >\n /*<![CDATA[*//*---->*/ \n");
	        	out.append( "var guide_xml=\"");
	        	String xml = fullBody.replace("\"", "\\\"");
	        	
	        	// trim trailing whitespace
	        	int lastIdx = xml.lastIndexOf("</guide>");
	        	if (lastIdx >=0)
	        		xml = xml.substring(0, lastIdx+8);
	        	
	        	xml = xml.replace("'", "\\'");
	        	xml = xml.replace("\n", "&#10;");
	        	xml = xml.replace("\r", "&#13;");
	        	out.append(xml);
	        	out.append("\";\n");
	        	
	        	//HttpServletRequest request = ServletActionContext.getRequest();
	        	if (request != null)
	        	{
	        		out.append("var guide_servletUrl='");
	        		String path = request.getContextPath() + "/plugins/servlet/";
	        		out.append(path);
	        		out.append("';\n");
	        	}

	        	String u = user == null ? "" : user.getName();
	        	out.append("var guide_user='" + u + "';\n");
	        	
	        	out.append("var guide_allowEdit=" + (user!=null) + ";\n");
	        	out.append("var guide_pageid=\'");
	        	out.append(contentObject.getId());
	        	out.append("\';\n");
	        	out.append("var guide_pagename=\'" + contentObject.getTitle() + "\';\n");
	        	out.append("\n /*--*//*]]>*/ \n</script>");
	        	out.append("<iframe src=\"javascript:''\" id='__gwt_historyFrame' tabIndex='-1' style='position:absolute;width:0;height:0;border:0'></iframe>");
	        	out.append("<script  src=\'/thesarvoguide2/thesarvoguide2.nocache.js\' ></script> \n");
	        	out.append("<div id='guidediv' ></div>\n");
	        	
	        	return out.toString();
	        }
        	

        }
        catch (Exception e)
        {

            logger.error("Error while trying to display Guide!", e);
            
            e.printStackTrace();
            throw new RuntimeException("Error while trying to display Guide! " + e.toString() + " " + e.getMessage(), e);
        }
    }





	public void setPageManager(PageManager pm)
    {
    	this.pageManager = pm;
    }



	public String getName()
    {
        return "guide";
    }

    /**
     * This dependency will be resolved automatically before the macro is used.
     */
    public void setContentPropertyManager(ContentPropertyManager contentPropertyManager)
    {

        this.contentPropertyManager = contentPropertyManager;
    }
	/**
	 * @return Returns the subRenderer.
	 */
	public SubRenderer getSubRenderer()
	{
		return subRenderer;
	}
	/**
	 * @param subRenderer The subRenderer to set.
	 */
	public void setSubRenderer(SubRenderer subRenderer)
	{
		this.subRenderer = subRenderer;
	}


	/**
	 * @return Returns the resourcePath.
	 */
	public String getResourcePath()
	{
		return resourcePath;
	}
	/**
	 * @param resourcePath The resourcePath to set.
	 */
	public void setResourcePath(String resourcePath)
	{
		this.resourcePath = resourcePath;
	}

	public String hello()
	{
		return "Hello World";
	}




	/**
	 * @return Returns the pageManager.
	 */
	public PageManager getPageManager()
	{
		return pageManager;
	}



	/**
	 * @return Returns the bootstrapManager.
	 */
	public BootstrapManager getBootstrapManager()
	{
		return bootstrapManager;
	}



	/**
	 * @param bootstrapManager The bootstrapManager to set.
	 */
	public void setBootstrapManager(BootstrapManager bootstrapManager)
	{
		this.bootstrapManager = bootstrapManager;
	}

	public String getContextPath()
	{
		return bootstrapManager.getWebAppContextPath();
	}



	/**
	 * @return the permissionManager
	 */
	public PermissionManager getPermissionManager()
	{
		return permissionManager;
	}



	/**
	 * @param permissionManager the permissionManager to set
	 */
	public void setPermissionManager(PermissionManager permissionManager)
	{
		this.permissionManager = permissionManager;
	}



	@Override
	public void disabled()
	{
		if (bannerGrabber!=null && bannerGrabber.isAlive())
		{
			logger.warn("stopping bannerGrabber");
			bannerGrabber.stop();
			bannerGrabber = null;
		}
		
	}



	@Override
	public void enabled()
	{
		if (bannerGrabber==null)
		{
			logger.warn("starting bannerGrabber");
			bannerGrabber = new BannerGrabber();
			bannerGrabber.start();
		}
		
	}



	  @Override
	public String execute(Map<String, String> params, String body, ConversionContext conversionContext) throws MacroExecutionException	
	{
		try 
		{
			return execute( params, body, conversionContext.getPageContext() );
		} 
		catch (MacroException e) 
		{
			
			e.printStackTrace();
			throw new MacroExecutionException("Error rendering guide macro", e);
		}
	}



	@Override
	public BodyType getBodyType() 
	{
		return BodyType.PLAIN_TEXT;
	}



	@Override
	public OutputType getOutputType() 
	{
		return OutputType.BLOCK;
	}



//	/**
//	 * @return Returns the contentEntityManager.
//	 */
//	public ContentEntityManager getContentEntityManager()
//	{
//		return contentEntityManager;
//	}
//	/**
//	 * @param contentEntityManager The contentEntityManager to set.
//	 */
//	public void setContentEntityManager(ContentEntityManager contentEntityManager)
//	{
//		this.contentEntityManager = contentEntityManager;
//	}
}