package com.thesarvo.guide.client.view.node;

import com.google.gwt.cell.client.FieldUpdater;
import com.google.gwt.cell.client.TextCell;
import com.google.gwt.cell.client.TextInputCell;
import com.google.gwt.user.cellview.client.Column;
import com.thesarvo.guide.client.model.MapDrawingObject;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class MapColumn extends Column<MapDrawingObject, String> implements FieldUpdater<MapDrawingObject, String>
{
	interface UpdateCallback
	{
		void onUpdate(MapColumn boundColumn, MapDrawingObject model, String value);
	}
	
	boolean editable = false;
	String binding = "";
	UpdateCallback updateCallback = null;
	
	public MapColumn(boolean editable, String binding, UpdateCallback onUpdate) 
	{
		super(editable ? new TextInputCell() : new TextCell());
		this.editable = editable;
		this.binding = binding;
		this.updateCallback = onUpdate;
		setFieldUpdater(this);
	}

	@Override
	public String getValue(MapDrawingObject object) 
	{
		return object.getModel().get(binding);
	}

	@Override
	public void update(int index, MapDrawingObject object, String value)
	{
		object.getModel().put(binding, value);
		
		if (updateCallback != null)
			updateCallback.onUpdate(this, object, value);
	}

	public Object getBinding()
	{
		return binding;
	}

}
