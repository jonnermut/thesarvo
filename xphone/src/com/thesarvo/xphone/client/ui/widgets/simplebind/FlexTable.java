package com.thesarvo.xphone.client.ui.widgets.simplebind;

import com.google.gwt.user.client.ui.Widget;

public class FlexTable extends com.google.gwt.user.client.ui.FlexTable
{
	int columns = 1;
	
	int index = 0;
	int repeaterRow = 0;
	
	Repeater repeater = null;
	
	String rowStyleName = null;

	/**
	 * @return the columns
	 */
	public int getColumns()
	{
		return columns;
	}

	/**
	 * @param columns the columns to set
	 */
	public void setColumns(int columns)
	{
		this.columns = columns;
	}
	
	@Override
	public void add(Widget child) 
	{
		if (child instanceof Repeater)
		{
			repeater = (Repeater) child;
			repeater.setPanel(this);
			repeaterRow = index / columns;
		}
		else
		{
			int row = index / columns;
			int col = index % columns;
		
			this.setWidget(row, col, child);
			
			//String rowStyle = getRowStyle(row);
			//this.getRowFormatter().setStyleName(row, arg1)
		
			index ++ ;
		}
	}
	
//	private String getRowStyle(int row)
//	{
//		if (rowClasses)
//	}

	@Override
	public void clear()
	{
		super.clear();
	}
	
	public void clearRepeater()
	{
		int c = getRowCount();
		for (int i=repeaterRow; i<c; i++)
		{
			removeRow(repeaterRow);
		}
	}

	/**
	 * @return the repeater
	 */
	public Repeater getRepeater()
	{
		return repeater;
	}

	/**
	 * @param repeater the repeater to set
	 */
	public void setRepeater(Repeater repeater)
	{
		this.repeater = repeater;
		
	}

	/**
	 * @return the rowClasses
	 */
	public String getRowStyleName()
	{
		return rowStyleName;
	}

	/**
	 * @param rowClasses the rowClasses to set
	 */
	public void setRowStyleName(String rowStyleName)
	{
		this.rowStyleName = rowStyleName;
	}
	
	@Override
	public FlexCellFormatter getCellFormatter()
	{
		return (FlexCellFormatter) super.getCellFormatter();
	}
}
	