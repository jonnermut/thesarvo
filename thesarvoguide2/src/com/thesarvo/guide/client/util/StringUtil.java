package com.thesarvo.guide.client.util;

import java.util.Collection;

public class StringUtil
{
	public static String string(Object value)
	{
		return value == null ? null : value.toString();
	}

	public static boolean bool(Object object)
	{
		if (object==null)
			return false;
		if (object instanceof Boolean)
			return (Boolean) object;
		if (object instanceof String)
		{
			return  !(((String) object).trim().length()==0 || ((String) object).toLowerCase().equals("false"));
		}
		if (object instanceof Number)
			return !(object.equals(0));
		
		return true;
	}

	public static String notNull(String str)
	{
		if (str==null)
			return "";
		else
			return str;
	}

	public static boolean isEmpty(Object obj)
	{
		if (obj==null)
			return true;
		
		if (obj instanceof String)
			return isEmpty((String)obj);
		
		if (obj instanceof Collection)
			return ((Collection)obj).isEmpty();
		
		return false;
	}
	
	public static boolean isNotEmpty(Object obj)
	{
		return !isEmpty(obj);
	}
	
	public static boolean isEmpty(String str)
	{
		return (str==null || str.trim().length() == 0);
	}
	
	public static boolean isNotEmpty(String str)
	{
		return !isEmpty(str);
	}
	
	public static native String[] simpleSplit(String str, String delim) /*-{
		return str.split(delim);
	}-*/;

	public static String getLastSegment(String str,	String delim)
	{
		if (str==null)
			return null;
		
		String[] split = simpleSplit(str, delim);
		return split[split.length-1];
	}
}
