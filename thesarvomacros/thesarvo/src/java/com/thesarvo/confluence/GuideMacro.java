package com.thesarvo.confluence;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;
import org.dom4j.Document;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;

import com.atlassian.confluence.core.ContentEntityObject;
import com.atlassian.confluence.core.ContentPropertyManager;
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
public class GuideMacro extends InlineHtmlMacro implements ResourceAware, com.atlassian.plugin.StateAware
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



    public String execute(Map parameters, String fullBody, RenderContext renderContext) throws MacroException
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
	        	out.append( "var guide_xml=\'");
	        	String xml = fullBody.replaceAll("\'", "\\\\'");
	        	xml = xml.replaceAll("\\n", "\\\\n");
	        	xml = xml.replaceAll("\\r", "\\\\r");
	        	out.append(xml);
	        	out.append("\';\n");
	        	
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
	        	out.append("<script src=\'/thesarvoguide/thesarvoguide.nocache.js\' ></script> \n");
	        	out.append("<div id='guidediv' ></div>\n");
	        	
	        	return out.toString();
	        }
        	
        	// get the body of the macro, and create the task list model
        	//Page p;

//        	logger.debug("content:" + fullBody);
//
//        	//int start = macroParameter.getContentStart();
//        	int start = fullBody.indexOf("{guide}") + 7;
//        	int end = fullBody.indexOf("{guide}",start);
//
//        	if (end<0)
//        		end = start;

        	//logger.debug("start:"+start);
        	//logger.debug("end:"+end);

//        	String body = fullBody.substring(start,end);
//
//        	logger.debug("body:" + body);

        	//String body = macroParameter.getContent();

        	//body = body.replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&apos;","\'").replaceAll("&quot;","\"").replaceAll("&#039;","\'").replaceAll("&#034;","\"");

        	//String body = contentPropertyManager.getStringProperty(contentObject,"guide.content2");



////        	Guide guide = new Guide( contentObject, fullBody, contentPropertyManager,  subRenderer, renderContext, this);
////
////			// check if any request parameters came in to complete or uncomplete tasks
////		    final HttpServletRequest request = ServletActionContext.getRequest();
////
////		    if (request.getParameter("guide.editGuide")!=null )
////		    {
////		    	JSONRPCBridge bridge = null;
////		    	
////		    	// causes class cast errors on upgrade
////	    		//JSONRPCBridge bridge = (JSONRPCBridge) request.getSession().getAttribute("JSONRPCBridge");
////	    		//if (bridge==null)
////	    		//{
////	    			logger.debug("Creating json rpc bridge");
////	    			bridge = new JSONRPCBridge();
////	    			bridge.setDebug(false);
////	    			request.getSession().setAttribute("JSONRPCBridge",bridge);
////
////	    		//}
////				if (bridge!=null)
////				{
////					logger.debug("registering object");
////
////					bridge.registerObject("guideMacro",guide);
////				}
////		    }
////
////		    boolean render = true;
////		    if (request != null)
////		    {
////		        //String remoteUser = request.getRemoteUser();
////
////	        	String action = request.getParameter("guide.action");
////
////	        	//String gid = request.getParameter("guide.id");
////
////	        	String spage = request.getParameter("guide.page");
////
////	        	if (spage!=null && spage.length()>0)
////	        	{
////	        		if (spage.equals("all"))
////	        			guide.setPage(-1);
////	        		else
////	        			guide.setPage( Integer.parseInt(spage) );
////	        	}
////
////	        	//int id=-1;
////	        	//if (gid!=null && gid.length()>0)
////	        	//	id = Integer.parseInt(gid);
////
////	        	//String id = request.getParameter("guide.id");
////
////	            if ( action != null)
////	            {
////	            	logger.debug("action=" + action);
////	            	if (action.equals("showxml") )
////	            	{
////	            		ret = "<!-- guide.xml.start " + fullBody + " guide.xml.end -->";
////	            		render = false;
////	            	}
////	            	if (action.equals("showattach"))
////	            	{
////	            		//XMLFacade attach = new XMLFacade();
////	            		Document attach = DocumentHelper.createDocument();
////	                    Element attachmentsNode = attach.addElement( "attachments" );
////	            		
////	            		//Node attachmentsNode = attach.createNode("attachments","");
////	        			List atlist = contentObject.getLatestVersionsOfAttachments();
////	        			for (int n=0;n<atlist.size();n++)
////	        			{
////	        				Attachment at = (Attachment) atlist.get(n);
////	        				
////	        				SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
////	        				String modDate = sdf.format( at.getLastModificationDate() );	        		        
////
////	        		        Element attachmentNode = attachmentsNode.addElement( "attachment" )
////	        		            .addAttribute( "filename", at.getFileName() )
////	        		            .addAttribute( "url", at.getDownloadPath() )
////	        		            .addAttribute( "version", at.getAttachmentVersion().toString() )
////	        		            .addAttribute( "modificationDate", modDate );
////	        		            
////	        				//Node attachmentNode = attach.createNode(attachmentsNode,"attachment","");
//////	        				attach.setAttribute(attachmentNode,"filename",at.getFileName());
//////	        				attach.setAttribute(attachmentNode,"url",at.getDownloadPath() );
//////	        				attach.setAttribute(attachmentNode,"version",at.getAttachmentVersion().toString());
//////
//////	        				attach.setAttribute(attachmentNode,"modificationDate",modDate);
////	        			}
////	        			ret = "<!-- guide.xml.start " + attach.asXML() + " guide.xml.end -->";
////	            		render = false;
////	            	}
//////	            	if (action.equals("edit"))
//////	            	{
//////	            		logger.debug("edit");
//////	            		guide.setEditIndex(id);
//////	            	}
//////	            	if (action.equals("insert"))
//////	            	{
//////	            		logger.debug("insert");
//////	            		String type = request.getParameter("guide.type");
//////
//////	            		guide.insert(id,type);
//////	            		guide.setEditIndex(id+1);
//////
//////	            		saveGuide();
//////	            	}
//////	            	if (action.equals("submit"))
//////	            	{
//////	            		logger.debug("submit");
//////	            		String classVal = request.getParameter("class");
//////	            		if ("import".equals(classVal))
//////	            		{
//////	            			importGuides();
//////	            		}
//////	            		else
//////	            		{
//////	            			guide.edit(id,request);
//////	            			saveGuide();
//////	            		}
//////	            	}
//////	            	if (action.equals("delete"))
//////	            	{
//////	            		logger.debug("delete");
//////	            		guide.delete(id);
//////	            		saveGuide();
//////	            	}
////	            }
////		    }
////
////		    //String content = contentObject.getContent();
////		    //content.replaceAll(body,guide.getDataXml());
////		    //contentObject.setContent(content);
////
////		    User user = AuthenticatedUserThreadLocal.getUser();
////		    boolean canEdit = false;
////		    if (user!=null)
////		    {
////		    	canEdit = permissionManager.hasPermission(user, Permission.EDIT, contentObject);
////		    }
////		    
////			if (render)
////				ret = guide.render(request, canEdit);
//////
////        // now create a simple velocity context and render a template for the output
////        //Map contextMap = MacroUtils.defaultVelocityContext();
////        //contextMap.put("tasklist", taskList);
////        //contextMap.put("content", contentObject);
////
////
////        //    return VelocityUtils.getRenderedTemplate("templates/extra/thesarvo/guidemacro.vm", contextMap);
////
//
//
//        	return ret;
        }
        catch (Exception e)
        {

            logger.error("Error while trying to display Guide!", e);
            
            e.printStackTrace();
            throw new RuntimeException("Error while trying to display Guide! " + e.toString() + " " + e.getMessage(), e);
        }
    }

	/**
	 *
	 */
	private void importGuides() throws Exception
	{
//		Page currentPage  = pageManager.getPage(contentObject.getId() );
//		Page parentPage  = pageManager.getPage(84 );
//
//		File dir = new File("C:\\Inetpub\\wwwroot\\guide\\guides2");
//		File[] files = dir.listFiles();
//		for (int i=0;i<files.length;i++)
//		{
//			String filename = files[i].getName();
//			String name = filename.substring(0,filename.indexOf("."));
//			System.out.println("Processing:" + name);
//			XMLFacade guideXML = new XMLFacade( files[i]);
//			Guide newGuide = new Guide(contentObject,"",null, null);
//			newGuide.convertOldGuide(guideXML.getXML());
//
//
//
//			System.out.println("Creating page");
//			Page newPage = new Page();
//			newPage.setTitle(name + " bouldering");
//			newPage.setSpace( currentPage.getSpace() );
//			newPage.setContent("{guide}\n" + newGuide.getDataXml().replaceFirst("<\\?xml.+\\?>", "") + "\n{guide}");
//			newPage.setParentPage(parentPage);
//			currentPage.getSpace().addAbstractPage(newPage);
//
//
//
//			File[] attachments = new File("C:\\Inetpub\\wwwroot\\guide\\img\\").listFiles();
//
//			for (int a=0;a<attachments.length;a++)
//			{
//
//				String imgfn = attachments[a].getName();
//				if (imgfn.startsWith(name))
//				{
//					Attachment att = new Attachment();
//					att.setFileName(attachments[a].getName() );
//					att.setFileSize( attachments[a].length() );
//					newPage.addAttachment(att);
//					if (imgfn.toLowerCase().endsWith(".jpg") || imgfn.toLowerCase().endsWith(".jpe") || imgfn.toLowerCase().endsWith(".jpeg"))
//						att.setContentType("image/jpeg");
//					if (imgfn.toLowerCase().endsWith(".gif"))
//						att.setContentType("image/gif");
//					if (imgfn.toLowerCase().endsWith(".png"))
//						att.setContentType("image/png");
//					//attachmentManager.
//					attachmentManager.saveAttachment(att, null, new FileInputStream( attachments[a]) );
//				}
//			}
//
//			pageManager.saveContentEntity(newPage);
//		}
//
	}



	public void setPageManager(PageManager pm)
    {
    	this.pageManager = pm;
    }

//    /**
//	 * @param contentObject
//	 * @param guide
//	 * @throws Exception
//	 */
//	protected void saveGuide(Guide guide) throws Exception
//	{
//		logger.debug("saveGuide");
//
//
//		ContentEntityObject old = (ContentEntityObject) guide.getContent().clone();
//
//		String content = guide.getContent().getContent();
//		//Pattern
//		//int index = content.indexOf(body);
//
//    	int start = content.indexOf("{guide}")+7;
//    	int end = content.indexOf("{guide}",start);
//
//    	String suffix = "";
//
//    	if (end<0)
//    	{
//    		end = start;
//    		suffix = "\n {guide} \n";
//    	}
//
//		//System.out.println(index);
////		System.out.println(macro.getContentStart());
////		System.out.println(macro.getContentEnd());
////		System.out.println(macro.getLength());
////		System.out.println(macro.getEnd());
////		System.out.println("content:" + content);
////		System.out.println("macro content:" + macro.getContent() );
////		System.out.println(index);
//
//		//content.replaceAll(macro.getContent())
//
//
//
//		String newContent = content.substring(0,start) + guide.getDataXml() + suffix + content.substring( end );
//		//System.out.println("new: " + newContent);
//
//		Calendar c= new GregorianCalendar();
//		c.setTime(old.getLastModificationDate());
//
//		guide.getContent().setContent(newContent);
//		SaveContext sc = new DefaultSaveContext();
//		sc.setMinorEdit(true);
//
//		logger.debug("saving now");
//		if ( c.get(Calendar.DAY_OF_YEAR)==new GregorianCalendar().get(Calendar.DAY_OF_YEAR) )
//			pageManager.saveContentEntity(guide.getContent(),sc);
//		else
//			pageManager.saveContentEntity(guide.getContent(),old,sc);
//	}

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