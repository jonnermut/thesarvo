package com.thesarvo.xphone.client.ui.widgets;

import java.util.Iterator;

import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HasWidgets;
import com.google.gwt.user.client.ui.Widget;

public class HasWidgetsComposite extends Composite implements HasWidgets
{

	@Override
	public void add(Widget w)
	{
		((HasWidgets)getWidget()).add(w);
		
	}

	@Override
	public void clear()
	{
		((HasWidgets)getWidget()).clear();
		
	}

	@Override
	public Iterator<Widget> iterator()
	{
		return ((HasWidgets)getWidget()).iterator();
	}

	@Override
	public boolean remove(Widget w)
	{
		return ((HasWidgets)getWidget()).remove(w);
	}

}
