//package com.thesarvo.confluence;
//
//import java.util.ArrayList;
//import java.util.HashSet;
//import java.util.List;
//import java.util.Set;
//
//import com.atlassian.confluence.core.ListQuery;
//import com.atlassian.confluence.core.SmartListManager;
//import com.atlassian.confluence.pages.Page;
//import com.atlassian.confluence.renderer.radeox.macros.RecentlyUpdatedContentMacro;
//import com.atlassian.confluence.search.actions.SearchResultWithExcerpt;
//import com.atlassian.user.search.SearchResult;
//
//public class RecentlyUpdated extends RecentlyUpdatedContentMacro
//{
//
//	public void setSmartListManager(SmartListManager arg0)
//	{
//
//		super.setSmartListManager(new SmartListManagerWrapper(arg0) );
//	}
//
//	public String getName()
//	{
//		return "updated2";
//	}
//
//	public class SmartListManagerWrapper implements SmartListManager
//	{
//		SmartListManager sml;
//
//		public SmartListManagerWrapper(SmartListManager sml)
//		{
//			super();
//
//			this.sml = sml;
//		}
//
//		/* (non-Javadoc)
//		 * @see com.atlassian.confluence.core.SmartListManager#getListQueryResults(com.atlassian.confluence.core.ListQuery, boolean)
//		 */
//		public List getListQueryResults(ListQuery query, boolean arg1)
//		{
//			int max = query.getMaxResults();
//			query.setMaxResults(max*4);
//			List results = sml.getListQueryResults(query, arg1);
//
//			List ret = new ArrayList();
//
//			Set pages = new HashSet();
//
//			for (int i=0;i<results.size();i++)
//			{
//				//Page p = (Page) results.get(i);
//				SearchResultWithExcerpt sr = (SearchResultWithExcerpt) results.get(i);
//				String name = (String) sr.get("realTitle");
//				if (name!=null && !pages.contains(name))
//				{
//					pages.add(name);
//					ret.add(sr);
//				}
//
//			}
//			if (ret.size()>max)
//				ret = ret.subList(0,max-1);
//
//			return ret;
//		}
//
//		/* (non-Javadoc)
//		 * @see com.atlassian.confluence.core.SmartListManager#getStatusMessageKey()
//		 */
//		public String getStatusMessageKey()
//		{
//			return sml.getStatusMessageKey();
//		}
//
//	}
//
//}
