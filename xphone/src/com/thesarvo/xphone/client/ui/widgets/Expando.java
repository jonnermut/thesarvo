package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.ui.FlowPanel;
import com.thesarvo.xphone.client.mobilewebkit.TouchPanel;
import com.thesarvo.xphone.client.ui.theme.JqtTheme;
import com.thesarvo.xphone.client.util.Logger;

public class Expando extends FlowPanel
{
	TouchPanel label;
	FlowPanel content;
	
	public Expando()
	{
		
		label = new TouchPanel();
		label.getTouchManager().initTouchTracking();
		label.getTouchManager().setFiresClicks(true);
		label.setStyleName(JqtTheme.INSTANCE.themeStyle().expandoLabel());
		label.addStyleName(JqtTheme.INSTANCE.themeStyle().expandoLabelClosed());
		this.add(label);
		
		
		content = new FlowPanel();
		content.setVisible(false);
		content.setStyleName(JqtTheme.INSTANCE.themeStyle().expandoContent());
		this.add(content);
		
		
		label.getTouchManager().addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				toggleState();
			}
		});
	}

	/**
	 * @return the label
	 */
	public TouchPanel getLabel()
	{
		return label;
	}

	/**
	 * @param label the label to set
	 */
	public void setLabel(TouchPanel label)
	{
		this.label = label;
	}

	/**
	 * @return the content
	 */
	public FlowPanel getContent()
	{
		return content;
	}

	/**
	 * @param content the content to set
	 */
	public void setContent(FlowPanel content)
	{
		this.content = content;
	}

	public void toggleState()
	{
		//Window.alert("clicked!");
		//capture.setStyleName("slideup.out.reverse");
		Logger.debug("Expando.toggleState");
		
		boolean open = content.isVisible();
		
		content.setVisible(!open);
		
		if (open)
		{
			label.removeStyleName( JqtTheme.INSTANCE.themeStyle().expandoLabelOpened());
			label.addStyleName(JqtTheme.INSTANCE.themeStyle().expandoLabelClosed());
		}
		else
		{
			label.removeStyleName( JqtTheme.INSTANCE.themeStyle().expandoLabelClosed());
			label.addStyleName(JqtTheme.INSTANCE.themeStyle().expandoLabelOpened());
			
		}
	}
}
