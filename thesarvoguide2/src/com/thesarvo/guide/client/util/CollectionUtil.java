package com.thesarvo.guide.client.util;

import java.util.ArrayList;
import java.util.List;

public abstract class CollectionUtil
{
	@SuppressWarnings("unchecked")
	public static  List<String> list(Object l)
	{
		List<String> list;
		if (l!=null)
		{
			if (l instanceof List<?>)
				list = (List<String>) l;
			else
			{
				list = new ArrayList<String>();
				list.add(StringUtil.string(l));
			}
			return list;
		}
		else
			return new ArrayList<String>();
	}
}
