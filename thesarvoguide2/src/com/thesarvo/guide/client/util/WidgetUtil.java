package com.thesarvo.guide.client.util;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.dom.client.Element;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.UIObject;

public class WidgetUtil
{
	@SuppressWarnings("unchecked")
	public static void populateListBoxWithEnum(ListBox listbox, Class clazz)
	{
		for (Object e : clazz.getEnumConstants())
		{
			listbox.addItem( ((Enum)e).name());
		}
	}
	
	
	public static String getSelectedSingleValue(ListBox listbox)
	{
		int index = listbox.getSelectedIndex();
		String val = index!=-1 ? listbox.getValue( index ) : null;
		return val;
	}
	
	public static Object getSelectedValue(ListBox listbox)
	{
		if (!listbox.isMultipleSelect())
			return getSelectedSingleValue(listbox);
		
		return getSelectedMultipleValue(listbox);
	}


	public static List<String> getSelectedMultipleValue(ListBox listbox)
	{
		List<String> ret = new ArrayList<String>();
		for (int i=0;i<listbox.getItemCount();i++)
		{
			if (listbox.isItemSelected(i))
				ret.add(listbox.getValue(i));
		}
		return ret;
	}


	public static void setValue(ListBox widget, String value)
	{
		for (int i=0; i<widget.getItemCount(); i++)
		{
			if (widget.getValue(i).equals(value))
			{
				widget.setItemSelected(i, true);
				break;
			}
		}
	}
	
	public static void setValue(ListBox widget, List<String> values)
	{
		for (int i=0; i<widget.getItemCount(); i++)
		{
			boolean contains = values.contains( widget.getValue(i) );
			
			widget.setItemSelected(i, contains);
			
		}
		
	}


	public static void setVisible(Element element, boolean value)
	{
		//element.getStyle().setDisplay( value ? Display.BLOCK : Display.NONE);
		UIObject.setVisible(element, value);
	}


	public static void populateListBox(ListBox listBox,
			Iterable<String> list)
	{
		for (String s: list)
			listBox.addItem(s);
	}


	public static void populateListBox(ListBox listBox, String[] strings)
	{
		for (String s: strings)
			listBox.addItem(s);
	}



	
	
}
