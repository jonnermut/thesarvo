package com.thesarvo.xphone.client.mobilewebkit;



import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.ui.FlowPanel;

public class TouchPanel extends FlowPanel implements HasTouchManager, HasTransitionEndHandlers, HasAnimationEndHandlers
{	
	TouchManager touchManager = null;

	public TouchPanel()
	{
		//this(new TouchManager());
		super();
		touchManager = new TouchManager(this);
	}
	
	public TouchPanel(TouchManager tm)
	{
		touchManager = tm;
//		if (touchManager!=null && touchManager.getWidget()!=null && touchManager.getWidget()!=this)
//			touchManager.setWidget(this);
	}
	
	@Override
	public HandlerRegistration addTransitionEndHandler(
			TransitionEndHandler handler)
	{
		
		return addDomHandler(handler, TransitionEndEvent.getType());
	}

	@Override
	public HandlerRegistration addAnimationEndHandler(
			AnimationEndHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("TouchPanel.addAnimationEndHandler()");
		return addDomHandler(handler, AnimationEndEvent.getType());
	}

	public void setText(String string)
	{
		getElement().setInnerText(string);
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
