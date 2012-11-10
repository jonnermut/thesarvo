package com.thesarvo.xphone.client.ui;

import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Widget;
import com.thesarvo.xphone.client.mobilewebkit.AnimationEndEvent;
import com.thesarvo.xphone.client.mobilewebkit.AnimationEndHandler;
import com.thesarvo.xphone.client.mobilewebkit.HasAnimationEndHandlers;

public abstract class Animator
{

	private static void completeTransition(final Widget from, final Widget to,
			final Animation animation)
	{
		if (animation!=null)
			to.removeStyleName(animation.toString());
		
		to.removeStyleName("in");
		to.removeStyleName("reverse");
		
		if (from!=null)
		{
			UiUtil.setVisible(from, false);
			
			if (animation!=null)
				from.removeStyleName(animation.toString());
			
			from.removeStyleName("out");
			from.removeStyleName("reverse");
		}
	}
	
	public static void animateViews(final Widget from, final Widget to, final Animation animation, final boolean reverse)
	{
		com.thesarvo.xphone.client.util.Logger.debug("Amimator.animateViews()");
		//com.thesarvo.xphone.client.util.Logger.debug("Animate: " + from + ", " + to + ", " + animation + ", " + reverse);

		to.addStyleName(animation.toString());
		to.addStyleName("in");
		
		UiUtil.setVisible(to, true);
		if (reverse)
			to.addStyleName("reverse");
		
		if (from != null)
		{
			from.addStyleName(animation.toString());
			from.addStyleName("out");
			if (reverse)
				from.addStyleName("reverse");
		}
		
//		String toz = null;
//		if (to!=null && to.getElement()!=null)
//			toz = to.getElement().getStyle().getZIndex();
//		
//		int tozi = 0;
//		if (toz!=null && toz.length() > 0 && ( toz.charAt(0)=='-' || Character.isDigit( toz.charAt(0) )))
//		{
//			tozi = 
//		}
//		
		if (to!=null)
			to.getElement().getStyle().setZIndex(1);
		if (from!=null)
			from.getElement().getStyle().setZIndex(0);
			
		if (to instanceof HasAnimationEndHandlers)
		{
			
			com.thesarvo.xphone.client.util.Logger.debug("Animator.animateViews() - adding animation end handler");
			AnimEndHandler handler = new AnimEndHandler(animation, to, from);
			HandlerRegistration hr = ((HasAnimationEndHandlers) to).addAnimationEndHandler(handler);
			handler.setHandlerRegistration(hr);
			//com.thesarvo.xphone.client.util.Logger.debug("Animator.animateViews() - handler registration=" + hr.toString());
		}
	}


	private static final class AnimEndHandler implements AnimationEndHandler
	{
		private HandlerRegistration handlerRegistration;
		private final Animation animation;
		private final Widget to;
		private final Widget from;

		private AnimEndHandler(Animation animation,
				Widget to, Widget from)
		{
			//this.hr = hr;
			this.animation = animation;
			this.to = to;
			this.from = from;
		}

		@Override
		public void onAnimationEnd(AnimationEndEvent event)
		{
			//Window.alert("animation end");
			
			completeTransition(from, to, animation);
			
			if (handlerRegistration!=null)
				handlerRegistration.removeHandler();
			
			Window.scrollTo(0, 1);
		}

		/**
		 * @return the handlerRegistration
		 */
		public HandlerRegistration getHandlerRegistration()
		{
			return handlerRegistration;
		}

		/**
		 * @param handlerRegistration the handlerRegistration to set
		 */
		public void setHandlerRegistration(HandlerRegistration handlerRegistration)
		{
			this.handlerRegistration = handlerRegistration;
		}
	}
	
}
