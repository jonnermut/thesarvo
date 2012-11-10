package com.thesarvo.xphone.client.json;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONParser;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;
import com.thesarvo.xphone.client.model.simplebind.SimpleModel;

public class JSONWrapper implements Map<String, Object>, SimpleModel, SerializableToJSON
{
	JSONObject wrapped;

	public JSONWrapper()
	{
	}
	
	public JSONWrapper(JSONObject wrapped)
	{
		super();
		this.wrapped = wrapped;
	}

	public JSONWrapper(String json)
	{
		wrapped = (JSONObject) JSONParser.parse(json);
	}
	
	/**
	 * @return the wrapped
	 */
	public JSONObject getWrapped()
	{
		if (wrapped==null)
			wrapped = new JSONObject();
		
		return wrapped;
	}

	/**
	 * @param wrapped the wrapped to set
	 */
	public void setWrapped(JSONObject wrapped)
	{
		this.wrapped = wrapped;
	}
	
	/* (non-Javadoc)
	 * @see com.thesarvo.xphone.client.json.SerializableToJSON#toJSON()
	 */
	public String toJSON()
	{
		return getWrapped().toString();
	}
	
//	protected String getString(String key)
//	{
//		JSONValue jsonValue = getWrapped().get(key);
//		if (jsonValue!=null)
//		{
//			JSONString str = jsonValue.isString();
//			if (str!=null)
//				return str.stringValue();
//		}
//		
//		return null;
//	}
//	
//	protected void putString(String key, Object obj)
//	{
//		String str = obj == null ? null : obj.toString();
//		
//		getWrapped().put(key, new JSONString(str));
//	}

	@Override
	public void clear()
	{
	}

	@Override
	public boolean containsKey(Object key)
	{
		return getWrapped().containsKey(key.toString());
	}

	@Override
	public boolean containsValue(Object arg0)
	{
		throw new UnsupportedOperationException();
	}

	@Override
	public Set<java.util.Map.Entry<String, Object>> entrySet()
	{
		return null;
	}

	@Override
	public Object get(Object key)
	{
		JSONValue obj = getWrapped().get(key.toString());
		
		if (obj==null || (obj.isNull()!=null) )
			return null;
		
		JSONString str = obj.isString();
		if (str!=null)
			return str.stringValue();
		
		JSONBoolean bool = obj.isBoolean();
		if (bool!=null)
			return bool.booleanValue();
		
		JSONNumber num = obj.isNumber();
		if (num!=null)
			return num.doubleValue();
		
		return obj;
	}

	@Override
	public boolean isEmpty()
	{
		return (getWrapped().size()==0);
	}

	@Override
	public Set<String> keySet()
	{
		return getWrapped().keySet();
	}

	@Override
	public Object put(String key, Object val)
	{
		JSONValue json = JSONUtil.getJSONValue(val);
		
		getWrapped().put(key, json);
		
		return null;
	}

	@Override
	public void putAll(Map<? extends String, ? extends Object> arg0)
	{	
		throw new UnsupportedOperationException();
	}

	@Override
	public Object remove(Object arg0)
	{
		throw new UnsupportedOperationException();
	}

	@Override
	public int size()
	{
		return getWrapped().size();
	}

	@Override
	public Collection<Object> values()
	{
		throw new UnsupportedOperationException();
	}
	
}
