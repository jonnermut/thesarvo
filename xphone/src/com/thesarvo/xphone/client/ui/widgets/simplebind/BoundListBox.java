package com.thesarvo.xphone.client.ui.widgets.simplebind;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.event.dom.client.ChangeEvent;
import com.google.gwt.event.dom.client.ChangeHandler;
import com.google.gwt.event.dom.client.MouseDownEvent;
import com.google.gwt.event.dom.client.MouseDownHandler;
import com.google.gwt.user.client.ui.ListBox;
import com.thesarvo.xphone.client.model.simplebind.HasBindValue;

public class BoundListBox extends ListBox implements HasBindValue
{
	String bindValue;
	boolean extendedSelect = false;
	List<Integer> oldSelectedItems = null;
	
	public BoundListBox()
	{
		this.addMouseDownHandler(new MouseDownHandler()
		{
			@Override
			public void onMouseDown(MouseDownEvent event)
			{
				if (extendedSelect && isMultipleSelect())
				{
					oldSelectedItems = getSelectedItems();
				}
				
			}
		});
		
		this.addChangeHandler(new ChangeHandler()
		{
			@Override
			public void onChange(ChangeEvent event)
			{
				
				
				if (oldSelectedItems!=null)
				{
					List<Integer> newItems = getSelectedItems();
					Integer selected = null;
					boolean checked = true;
					if (newItems.size() == 1)
						selected = newItems.get(0);
					
					for (int i: oldSelectedItems)
					{
						if (selected==null || i!=selected)
							setItemSelected(i, true);
						else
						{
							setItemSelected(i, false);
							//selected=null;
							checked = false;
						}
					}
						
					if (selected!=null)
						setItemSelected(selected, checked);
				}
				
			}
		});
	}
	
	

	
	/**
	 * @return the bindValue
	 */
	public String getBindValue()
	{
		return bindValue;
	}

	/**
	 * @param bindValue the bindValue to set
	 */
	public void setBindValue(String bindValue)
	{
		this.bindValue = bindValue;
	}




	/**
	 * @return the extendedSelect
	 */
	public boolean isExtendedSelect()
	{
		return extendedSelect;
	}




	/**
	 * @param extendedSelect the extendedSelect to set
	 */
	public void setExtendedSelect(boolean extendedSelect)
	{
		this.extendedSelect = extendedSelect;
		
		if (extendedSelect)
			setMultipleSelect(true);
	}




	/**
	 * @return the selectedItems
	 */
	public List<Integer> getSelectedItems()
	{
		List<Integer> ret = new ArrayList<Integer>();
		for (int i=0; i<getItemCount(); i++)
		{
			if (this.isItemSelected(i))
				ret.add(i);
		}
		
		return ret;
	}
	
	
	
}
