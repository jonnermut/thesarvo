package com.thesarvo.xphone.client.mobilewebkit;



import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.ui.Hyperlink;

public class TouchHyperlink extends Hyperlink  implements HasTouchManager
{
	TouchManager touchManager = new TouchManager(this);
	
	public TouchHyperlink()
	{
		super();
		touchManager.initTouchTracking();
	}
	
	public TouchHyperlink(String text, String token)
	{
		super(text, token);
		touchManager.initTouchTracking();
		
		//addStyleName("active");
	}

	@Override
	public HandlerRegistration addClickHandler(ClickHandler handler)
	{
		if (TouchUtil.isTouchAvailable())
		{
			super.addClickHandler(new ClickHandler()
			{
				@Override
				public void onClick(ClickEvent event)
				{
					com.thesarvo.xphone.client.util.Logger.debug("TouchHyperlink.onClick " + getText());				
				}
			});
			
			return getTouchManager().addClickHandler(handler);
		}
		else
			return super.addClickHandler(handler);
	}
	
	/**
	 * @return the touchManager
	 */
	public TouchManager getTouchManager()
	{
		return touchManager;
	}

	/**
	 * @param touchManager the touchManager to set
	 */
	public void setTouchManager(TouchManager touchManager)
	{
		this.touchManager = touchManager;
	}
	

}
