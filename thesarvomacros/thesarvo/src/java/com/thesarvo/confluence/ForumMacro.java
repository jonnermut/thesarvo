//package com.thesarvo.confluence;
//
//import java.io.IOException;
//import java.util.Date;
//import java.util.List;
//import java.util.Map;
//import java.util.Set;
//import java.util.TreeMap;
//
//import javax.servlet.http.HttpServletRequest;
//
//import com.atlassian.confluence.pages.BlogPost;
//import com.atlassian.confluence.pages.Comment;
//import com.atlassian.confluence.pages.Page;
//import com.atlassian.confluence.renderer.PageContext;
//import com.atlassian.confluence.user.actions.ProfilePictureInfo;
//import com.atlassian.confluence.util.GeneralUtil;
//import com.atlassian.renderer.RenderContext;
//import com.atlassian.renderer.v2.macro.MacroException;
//import com.atlassian.renderer.v2.macro.ResourceAware;
//import com.atlassian.renderer.v2.macro.basic.InlineHtmlMacro;
//import com.atlassian.user.User;
////import com.opensymphony.webwork.ServletActionContext;
//
//public class ForumMacro extends InlineHtmlMacro implements ResourceAware
//{
//
//	protected String resourcePath;
//
//	@Override
//	public String execute(Map parameters, String body,
//			RenderContext renderContext) throws MacroException
//	{
//		StringBuffer out = new StringBuffer();
//		doForum((String) parameters.get("maxLength"), out,
//				(PageContext) renderContext);
//		return out.toString();
//	}
//
//	/**
//	 * @return the resourcePath
//	 */
//	public String getResourcePath()
//	{
//		return resourcePath;
//	}
//
//	/**
//	 * @param resourcePath
//	 *            the resourcePath to set
//	 */
//	public void setResourcePath(String resourcePath)
//	{
//		this.resourcePath = resourcePath;
//	}
//
//	void doForum(String maxLength, StringBuffer out, PageContext context)
//	{
//
//		//HttpServletRequest request = ServletActionContext.getRequest();
//		
//		
//		
//		if (request.getServerPort() == 8080)
//		{
//
//			String redir = "http://www.thesarvo.com" + request.getContextPath()
//					+ context.getEntity().getUrlPath();
//			if (com.opensymphony.webwork.ServletActionContext.getResponse() != null)
//				try
//				{
//					com.opensymphony.webwork.ServletActionContext.getResponse()
//							.sendRedirect(redir);
//				}
//				catch (IOException e1)
//				{
//					e1.printStackTrace();
//				}
//		}
//
//		int maxL = 50;
//		if (maxLength != null)
//			maxL = Integer.parseInt(maxLength);
//
//		out
//				.append("<style>.silverborder { border:1px solid silver;border-collapse:collapse }</style>"
//						+ "<table border=1 class='grid' style='width:100%;border:1px solid silver;border-collapse:collapse' cellpadding=2 >"
//						+ "<tr><th>Thread</th><th width='168'>Author</th><th>Replies</th><th>Last Post</th></tr>\n");
//
//		
//		List<BlogPost> list = Service.getPageManager().getBlogPosts(((Page) context.getEntity()).getSpace(), true);
//		//List<BlogPost> list = ((Page) context.getEntity()).getSpace().
//		//		.getCurrentBlogPosts();
//
//		Map map = new TreeMap();
//
//		for (BlogPost b : list)
//		{
//			ForumRow fr = new ForumRow();
//			fr.thread = "<a href=\'" + request.getContextPath()
//					+ b.getUrlPath() + "\' >"
//					+ GeneralUtil.htmlEncode(b.getTitle()) + "</a>";
//			fr.author = getUserFullName(b.getCreatorName());
//			fr.authorUsername = b.getCreatorName();
//			fr.replies = b.getComments().size();
//			
//			fr.lastPost = "Created by " + fr.author + "<br>" + formatDate(b.getCreationDate());
//					
//			
//			fr.createDate = formatDate(b.getCreationDate() );
//			
//			Date d = b.getCreationDate();
//
//			for (Comment comment : (List<Comment>) b.getComments())
//			{
//				Date cd = comment.getCreationDate();
//				if (cd.getTime() > d.getTime())
//				{
//					d = cd;
//					String lps =   "<a href='" 
//										+ request.getContextPath() 
//										+ comment.getUrlPath()
//										+ "' >"
//										+ "Reply by "
//										+ getUserFullName(comment.getCreatorName())
//										+ "</a><br>"
//										+ formatDate(d);
//					fr.lastPost = lps;
//				}
//			}
//			map.put(-d.getTime(), fr);
//		}
//
//		int i = 0;
//
//		for (Map.Entry e : (Set<Map.Entry>) map.entrySet())
//		{
//			if (i % 2 == 0)
//				out.append("<tr>");
//			else
//				out.append("<tr style='background-color:#F9FAFC'>");
//
//			ForumRow fr = (ForumRow) e.getValue();
//			
//			out.append("<td class='silverborder' >" + fr.thread + "</td>\n");
//			
//			// name and pic
//			out.append("<td><table class='comment' border=0><tr><td class='commentinfo' width='120' border='0' style='border:0px' >\n");
//			out.append("<div class='commentname'>" + fr.author + "</div>\n");
//			out.append("<div class='commentdate'>" + fr.createDate + "</div></td>\n");
//			out.append("<td class='commentphoto' width='48' border='0'  style='border:0px'>\n");
//			
//			ProfilePictureInfo logo = GeneralUtil.getUserAccessor().getUserProfilePicture(fr.authorUsername);
//			
//			
//			if (logo!=null )
//			{
//				String logosrc = request.getContextPath() + logo.getDownloadPath();
//				out.append("<img src='" + logosrc + "' align='absmiddle' border='0' width='48' height='48'>");
//			}
//			out.append("</td></tr></table></td>\n");
//			
//			
//			//out.append("<td class='silverborder' >" + fr.author + "</td>");
//			out.append("<td class='silverborder' >" + fr.replies + "</td>\n");
//			out.append("<td class='silverborder' >" + fr.lastPost + "</td>\n");
//			out.append("</tr>\n");
//
//			i++;
//			if (i >= maxL)
//				break;
//		}
//
//		out.append("</table>\n");
//
//	}
//
//	public String getUserFullName(String username)
//	{
//		if (username == null)
//			return "Anonymous";
//		User user = GeneralUtil.getUserAccessor().getUser(username);
//		return (user != null) ? user.getFullName() : "Anonymous";
//	}
//
//	public String formatDate(Date date)
//	{
//		String ret = GeneralUtil.formatDateFull(date);
//		if ((new Date()).getTime() - date.getTime() < 86400000L)
//			ret = "<span style=color:red >" + ret + "</span>";
//		else if ((new Date()).getTime() - date.getTime() < 86400000L * 4)
//			ret = "<span style=color:blue >" + ret + "</span>";
//		return ret;
//	}
//
//	class ForumRow
//	{
//		String thread;
//
//		String author;
//		String authorUsername;
//
//		int replies;
//
//		String lastPost;
//		
//		String createDate;
//	}
//}
