package com.thesarvo.xphone.client.json;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.Map.Entry;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONNull;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;

public abstract class JSONUtil
{

	@SuppressWarnings("unchecked")
	public static JSONValue getJSONValue(Object val)
	{
		JSONValue json = null;
		
		if (val instanceof JSONValue)
			json = (JSONValue) val;
		else if (val==null)
			json = JSONNull.getInstance();
		else if (val instanceof String)
			json = new JSONString((String) val);
		else if (val instanceof Number)
			json = new JSONNumber(((Number) val).doubleValue());
		else if (val instanceof Boolean)
			json = JSONBoolean.getInstance( ((Boolean)val).booleanValue() );
		else if (val instanceof JSONWrapper)
			json = ((JSONWrapper)val).getWrapped();
		else if (val instanceof Collection)
		{
			// this is pretty crap seeing as the object is probably already an array!
			json = new JSONArray();
			int i = 0;
			for (Object o : (Collection) val)
			{
				((JSONArray)json).set(i, getJSONValue(o));
			}
		}
		else if (val instanceof Map)
		{
			json = new JSONObject();
			for (Entry e : (Set<Map.Entry>) ((Map)val).entrySet() )
			{
				((JSONObject)json).put(e.getKey().toString(), getJSONValue(e.getValue()));
			}
		}
		else if (val instanceof Enum)
		{
			json = new JSONString(val.toString());
		}
		else
			throw new UnsupportedOperationException("Don't know how to convert " + val + " to a JSONValue");
		
		return json;
	}
	
	
}
