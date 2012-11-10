package com.thesarvo.confluence;

import java.io.IOException;
import java.net.URLEncoder;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.radeox.macro.parameter.MacroParameter;

import com.atlassian.confluence.core.ContentEntityObject;
import com.atlassian.confluence.core.ContentPropertyManager;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.renderer.radeox.macros.AbstractHtmlGeneratingMacro;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.opensymphony.webwork.ServletActionContext;



/**
 *
 *
 */
public class GuideContentsMacro extends AbstractHtmlGeneratingMacro
{



    ContentPropertyManager contentPropertyManager;
	private PageManager pageManager;

	MacroParameter parameter;

    protected String getHtml(MacroParameter macroParameter) throws IllegalArgumentException, IOException
    {
        try
        {

        	StringBuffer ret=new StringBuffer();

        	// retrieve a reference to the body object this macro is in
        	ContentEntityObject contentObject = MacroUtils.getContentEntityObject(macroParameter);
        	parameter = macroParameter;

        	Page page = pageManager.getPage( contentObject.getId() );

        	
        	List children = page.getSortedChildren();

        	ret.append("<table border=0 style='border:0px' >");
        	int total = renderChildren(children,ret,0,0);
        	ret.append("</table>");

        	if (total>0)
        		ret.append("<br>Total Problems: " + total);

        	ret.append("<br/>");

		    // check if any request parameters came in to complete or uncomplete tasks
		    final HttpServletRequest request = ServletActionContext.getRequest();

		    //contentObject.toPageContext().

        	return ret.toString();
        }
        catch (Exception e)
        {
            log.error("Error while trying to display Guide!", e);
            throw new IOException(e.getMessage());
        }
    }

    /**
	 * @param children
     * @param ret
	 */
	private int renderChildren(List children, StringBuffer ret, int level, int total)
	{


		// TODO: caching


		for (int i=0;i<children.size();i++)
		{
			Page child = (Page) children.get(i);
			if (child.getTitle().toLowerCase().startsWith("intro") )
			{
				children.remove(child);
				children.add(0,child);
				break;
			}
		}


		for (int i=0;i<children.size();i++)
		{
			Page child = (Page) children.get(i);

			String name = child.getTitle();
			String friendlyName = name.replaceAll(" bouldering","");

			boolean noContent = (child.getContent()==null || child.getContent().length()==0);

			//String wiki = "";
			ret.append("<tr " + (noContent? "style='margin-top:8px'":"") +  " ><td>");

			for (int n=0;n<level;n++)
				ret.append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");



			int problems = child.getContent().split("<problem").length -1;
			int climbs = child.getContent().split("<climb").length -1;

			if (!noContent  )
			{
				
				int stars=0;
				
				if (problems>0 || climbs>0)
				{
					int index =  child.getContent().indexOf("guidestars=");				
					if (index>=0)
					{
						index += 12;
						for (int s=0;s<3;s++)
						if (child.getContent().charAt(index+s)=='*')
							stars ++ ;
					}
				}
				ret.append( "<img src='" + Guide.RESOURCE_PATH  + stars + "star.gif' />");
			}
			//String wiki = " [" + friendlyName + "|"+ name + "] ";
			//renderWiki(ret,wiki );

			if (noContent)
				ret.append("<b >" + friendlyName + "</b>");
			else
				ret.append("<a href='" + URLEncoder.encode(name) + "'>" + friendlyName + "</a>");

			ret.append(("</td><td>"));

			if (climbs>0)
				ret.append( climbs + " climbs " );
			if (problems>0)
				ret.append( problems + " problems" );

			ret.append(("</td></tr>"));

			total += problems;



			//ret.append("<br/>");
			total = renderChildren(child.getSortedChildren(),ret,level+1,total);
		}

		return total;

	}

	protected void renderWiki(StringBuffer ret, String wikiText)
	{
		ret.append(  parameter.getContext().getRenderEngine().render(wikiText,parameter.getContext()) ) ;

	}

	public void setPageManager(PageManager pm)
    {
    	this.pageManager = pm;
    }


	public String getName()
    {
        return "guidecontents";
    }

    /**
     * This dependency will be resolved automatically before the macro is used.
     */
    public void setContentPropertyManager(ContentPropertyManager contentPropertyManager)
    {

        this.contentPropertyManager = contentPropertyManager;
    }
}