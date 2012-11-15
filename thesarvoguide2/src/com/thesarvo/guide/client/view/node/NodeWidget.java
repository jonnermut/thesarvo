package com.thesarvo.guide.client.view.node;

import com.google.gwt.uibinder.client.UiFactory;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HasText;
import com.google.gwt.user.client.ui.HasValue;
import com.google.gwt.user.client.ui.HasWidgets;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.view.HasBindValue;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class NodeWidget extends Composite implements com.thesarvo.guide.client.xml.HasSimpleModel
{
	XmlSimpleModel model;
	//private SimpleDataBinder binder = new SimpleDataBinder( this);
	
	protected Widget[] boundWidgets = null;
	
	public NodeWidget()
	{
		super();
		
	}
	
	//@UiFactory
	//public static Resources getResources() 
	//{
	//	return Resources.INSTANCE;
	//}
	
	public void init()
	{
		bindWidgets();
		updateAllWidgets();
	}
	
	public String getText()
	{
		
		String text = (String) getModel().get(".");
		// TODO : encode
		text = MultlineLabel.getConvertedText(text);
		return text;
	}


	public void updateAllWidgets()
	{
		setWidgetValuesFromModel();
	}

	protected void bindWidgets()
	{
		//setWidgetValueFromModel();
	}

	public void setWidgetValuesFromModel() 
	{
		if (boundWidgets != null)
		{
			for (Widget w : boundWidgets)
			{
				if (w instanceof HasBindValue)
				{
					String bindValue = ((HasBindValue)w).getBindValue();
					if (bindValue != null && bindValue.length() > 0 && getModel() != null)
					{
						String val = getModel().get(bindValue);
						
						if (w instanceof CheckBox)
						{
							((CheckBox)w).setValue( StringUtil.bool(val) );
							
						}
						else if (w instanceof HasText)
						{
							((HasText)w).setText(val);
						}
						else if (w instanceof HasValue)
							((HasValue)w).setValue(val);
						else if (w instanceof ListBox)
						{
							ListBox lb = (ListBox)w;
							for (int i=0;i<lb.getItemCount();i++)
							{
								String item = lb.getValue(i);
								if (item == null)
									item = lb.getItemText(i);
								if (item != null && item.equals(val))
								{
									lb.setSelectedIndex(i);
									break;
								}
							}
						}
					}
				}
			}
		}
	}
	
	public void setModelValuesFromWidgets()
	{
		setModelValuesFromWidgets(boundWidgets,  model);
	}
	
	public void setModelValuesFromWidgets(Widget[] boundWidgets, XmlSimpleModel model)
	{
		if (boundWidgets != null)
		{
			for (Widget w : boundWidgets)
			{
				if (w instanceof HasBindValue)
				{
					String bindValue = ((HasBindValue)w).getBindValue();
					if (bindValue != null && bindValue.length() > 0 && model != null)
					{
						String val = null;
						
						if (w instanceof CheckBox)
						{
							val = StringUtil.notNullToString( ((CheckBox)w).getValue() );
						}
						else if (w instanceof HasText)
						{
							val = ((HasText)w).getText();
						}
						else if (w instanceof HasValue)
						{
							val = StringUtil.string( ((HasValue)w).getValue() );
						}
						else if (w instanceof ListBox)
						{
							ListBox lb = (ListBox)w;
							int s = lb.getSelectedIndex();
							if (s >= 0)
							{
								val = lb.getValue(s);
								if (val == null)
									val = lb.getItemText(s);
							}
						}
						//val = StringUtil.notNull(val);
						
						if (val!=null)
							model.put(bindValue, val);
					}
				}
			}
		}
	}
	
	
	@Override
	public XmlSimpleModel getModel()
	{ 
		return model;
	}
	
	public void setModel(XmlSimpleModel model)
	{
		this.model = model;
	}

//	/**
//	 * @return the binder
//	 */
//	public SimpleDataBinder getBinder()
//	{
//		return binder;
//	}
//
//	/**
//	 * @param binder the binder to set
//	 */
//	public void setBinder(SimpleDataBinder binder)
//	{
//		this.binder = binder;
//	}
	
}
