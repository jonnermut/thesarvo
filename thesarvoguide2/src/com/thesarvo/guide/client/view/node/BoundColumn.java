package com.thesarvo.guide.client.view.node;

import com.google.gwt.cell.client.Cell;
import com.google.gwt.cell.client.EditTextCell;
import com.google.gwt.cell.client.TextCell;
import com.google.gwt.cell.client.TextInputCell;
import com.google.gwt.user.cellview.client.Column;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class BoundColumn extends Column<XmlSimpleModel, String> 
{
	boolean editable = false;
	String binding = "";
	
	public BoundColumn(boolean editable, String binding) 
	{
		super(editable ? new TextInputCell() : new TextCell());
		this.editable = editable;
		this.binding = binding;
	}

	@Override
	public String getValue(XmlSimpleModel object) 
	{
		return object.get(binding);
	}

}
