package com.thesarvo.guide.client.view.node;

import com.google.gwt.cell.client.FieldUpdater;
import com.google.gwt.cell.client.TextCell;
import com.google.gwt.cell.client.TextInputCell;
import com.google.gwt.user.cellview.client.Column;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class BoundColumn extends Column<XmlSimpleModel, String> implements FieldUpdater<XmlSimpleModel, String>
{
	
	boolean editable = false;
	String binding = "";
	
	public BoundColumn(boolean editable, String binding) 
	{
		super(editable ? new TextInputCell() : new TextCell());
		this.editable = editable;
		this.binding = binding;

		setFieldUpdater(this);
	}

	@Override
	public String getValue(XmlSimpleModel object) 
	{
		return object.get(binding);
	}

	@Override
	public void update(int index, XmlSimpleModel object, String value)
	{
		object.put(binding, value);

	}

	public Object getBinding()
	{
		return binding;
	}

}
