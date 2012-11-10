/*
 * Created on 21/11/2004
 *
 * To change the template for this generated file go to
 * Window - Preferences - Java - Code Generation - Code and Comments
 */
package com.thesarvo.confluence;



/**
 * @author jnermut
 *
 * To change the template for this generated type comment go to
 * Window - Preferences - Java - Code Generation - Code and Comments
 */
/*
public class NewsMacro extends BlogPostsMacro
{
	private String startsWith = "";
	private List blogList;
	
    public String getHtml(MacroParameter macroParameter) throws IllegalArgumentException, IOException
	{
    	startsWith = macroParameter.get("startsWith", 0);
    	if (startsWith==null)
    		startsWith = "";
    	
    	super.getHtml(macroParameter);
    	
    	StringBuffer sb= new StringBuffer();
    	
    	sb.append("<table width='99%' cellspacing='0' class='grid'><tr><th width='70%'>Title</th><th>Author</th> <th>Date Posted</th> </tr>"  );
    	
    	for (int i=0;i<blogList.size();i++)
    	{
    		PostHtmlTuple b = (PostHtmlTuple) blogList.get(i);
    		
    		sb.append("<tr><td><font size=8pt>");
    		sb.append( b.getPost().getTitle() );
    		sb.append("</td><td><font size=8pt>");
    		sb.append( b.getPost().getCreatorName() );
    		sb.append("</td><td><font size=8pt>");
    		sb.append( GeneralUtil.formatDateTime( b.getPost().getCreationDate() ) );
    		sb.append("</td></tr><tr><td colspan=3><font size=8pt>");
    		sb.append( b.getRenderedHtml() );
    		sb.append("</td></tr></table>");
    		
			
    	}
    	
    	return sb.toString();
	}
	
    public List toPostHtmlTuple(List blogPosts, String contentType)
    {
    	//List blogList = blogPosts;
    	
    	
		
    	if (startsWith!=null && startsWith.length()>0)
    	{
	    	for (int i=blogPosts.size()-1;i>=0;i--)
	    	{
	    		BlogPost b = (BlogPost) blogPosts.get(i);
	    		
	    		if ( ! b.getTitle().trim().toLowerCase().startsWith( startsWith.toLowerCase() ) )
	    		{
	    			blogPosts.remove(b);
	    		}
				
	    	}
    	}
    	
    	blogList = super.toPostHtmlTuple(blogPosts,contentType);
    	return blogList;
    }
	
}
*/