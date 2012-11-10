package com.thesarvo.guide.client.view.node;

import com.google.gwt.uibinder.client.UiFactory;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HasWidgets;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.xphone.client.model.simplebind.HasSimpleModel;
import com.thesarvo.xphone.client.model.simplebind.SimpleDataBinder;
import com.thesarvo.xphone.client.model.simplebind.SimpleModel;
import com.thesarvo.xphone.client.ui.widgets.simplebind.BoundMultlineLabel;

public class NodeWidget extends Composite implements HasSimpleModel
{
	SimpleModel model;
	private SimpleDataBinder binder = new SimpleDataBinder( this);
	
	
	public NodeWidget()
	{
		super();
		
	}
	
	@UiFactory 
	public static Resources getResources() 
	{
		return Resources.INSTANCE;
	}
	
	public void init()
	{
		bindWidgets();
		updateAllWidgets();
	}
	
	public String getText()
	{
		
		String text = (String) getModel().get(".");
		// TODO : encode
		text = BoundMultlineLabel.getConvertedText(text);
		return text;
	}


	public void updateAllWidgets()
	{
		getBinder().updateAllWidgets();
	}

	protected void bindWidgets()
	{
		getBinder().bindRecursive((HasWidgets) getWidget());
	}
	
	@Override
	public SimpleModel getModel()
	{ 
		return model;
	}
	
	public void setModel(SimpleModel model)
	{
		this.model = model;
	}

	/**
	 * @return the binder
	 */
	public SimpleDataBinder getBinder()
	{
		return binder;
	}

	/**
	 * @param binder the binder to set
	 */
	public void setBinder(SimpleDataBinder binder)
	{
		this.binder = binder;
	}
	
}
