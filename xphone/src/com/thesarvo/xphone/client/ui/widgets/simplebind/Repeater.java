package com.thesarvo.xphone.client.ui.widgets.simplebind;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.ui.Panel;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.xphone.client.model.simplebind.HasBindList;
import com.thesarvo.xphone.client.model.simplebind.HasSimpleModelList;
import com.thesarvo.xphone.client.model.simplebind.ModelRowDelegate;
import com.thesarvo.xphone.client.model.simplebind.SimpleDataBinder;
import com.thesarvo.xphone.client.model.simplebind.SimpleModel;
import com.thesarvo.xphone.client.ui.widgets.Tag;

public class Repeater extends Tag implements HasBindList, HasSimpleModelList
{
	//Widget repeatedWidget;
	ChildFactory childFactory = null;
	String bindList;
	
	List<SimpleModel> data = null;
	List<SimpleDataBinder> binders = new ArrayList<SimpleDataBinder>();

	Panel panel = this;
	
	public Repeater()
	{
		super();
	}

	public interface ChildFactory
	{
		public List<Widget> create(Repeater parent);
	}


	/**
	 * @return the childFactory
	 */
	public ChildFactory getChildFactory()
	{
		return childFactory;
	}


	/**
	 * @param childFactory the childFactory to set
	 */
	public void setChildFactory(ChildFactory childFactory)
	{
		this.childFactory = childFactory;
	}


	/* (non-Javadoc)
	 * @see com.thesarvo.xphone.client.ui.widgets.simplebind.HasBindList#getBindList()
	 */
	public String getBindList()
	{
		return bindList;
	}


	/* (non-Javadoc)
	 * @see com.thesarvo.xphone.client.ui.widgets.simplebind.HasBindList#setBindList(java.lang.String)
	 */
	public void setBindList(String bindRepeat)
	{
		this.bindList = bindRepeat;
	}


	@Override
	public List<SimpleModel> getList()
	{
		return data;
	}


	@Override
	public void setList(List<SimpleModel> list)
	{
		this.data = list;
		
		//Collections.sort(arg0, arg1)
		
		DeferredCommand.addCommand(new Command()
		{
			
			@Override
			public void execute()
			{
				resizeWidgets();
				updateAllWidgets();				
			}
		});
	}


	public void updateAllWidgets()
	{
		for (SimpleDataBinder sdb: binders)
		{
			sdb.updateAllWidgets();
		}
		
	}


	private void resizeWidgets()
	{
		
		if (getPanel() instanceof FlexTable)
		{
			// TODO: decouple
			((FlexTable)getPanel()).clearRepeater();
		}
		else
			getPanel().clear();
		
		
		binders.clear();
		
		int targetSize = data.size();
		
		for (int i = 0; i<targetSize; i++)
		{
			List<Widget> widgets = getChildFactory().create(this);

			SimpleDataBinder sdb = new SimpleDataBinder( new ModelRowDelegate(this, i) );
			binders.add(sdb);

			
			for (Widget w: widgets)
			{
				getPanel().add(w);	

				
				sdb.bindWidget( w);
			}
			
		}
		
		
//		int targetSize = data.size();
//		int currentSize = binders.size(); 
//		
////		binders.clear();
////		binders.addAll((Collection<? extends SimpleDataBinder>) list);
//		
//		if (targetSize < currentSize)
//		{
//			for (int i=currentSize-1; i > targetSize-1; i--)
//			{
//				binders.remove(i);
//				this.remove(i);
//			}
//		}
//		else if (targetSize > currentSize)
//		{
//			for (int i = currentSize; i<targetSize; i++)
//			{
//				List<Widget> widgets = getChildFactory().create(this);
//
//				SimpleDataBinder sdb = new SimpleDataBinder( new ModelRowDelegate(this, i) );
//				binders.add(sdb);
//				
//				for (Widget w: widgets)
//				{
//					this.add(w);	
//					
//					sdb.bindRecursive( (HasWidgets) w);
//				}
//				
//			}
//		}


	}


	/**
	 * @return the panel
	 */
	public Panel getPanel()
	{
		return panel;
	}


	/**
	 * @param panel the panel to set
	 */
	public void setPanel(Panel panel)
	{
		this.panel = panel;
	}
	
}
