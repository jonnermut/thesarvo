package com.thesarvo.xphone.client.ui.widgets;

import com.google.gwt.user.client.ui.Button;
import com.thesarvo.xphone.client.event.ViewTransition;
import com.thesarvo.xphone.client.ui.Animation;

// TODO: remove click delay as per http://cubiq.org/remove-onclick-delay-on-webkit-for-iphone/9

/**
 * 
 * @author jnermut
 *
 */
public class ViewNavigationButton extends Button
{
	String view = null;
	String animation = "slide";
	boolean reverse = false;
	
	/**
	 * @return the view
	 */
	public String getView()
	{
		return view;
	}
	/**
	 * @param view the view to set
	 */
	public void setView(String view)
	{
		this.view = view;
	}
	/**
	 * @return the animation
	 */
	public String getAnimation()
	{
		return animation;
	}
	/**
	 * @param animation the animation to set
	 */
	public void setAnimation(String animation)
	{
		this.animation = animation;
	}
	/**
	 * @return the reverse
	 */
	public boolean isReverse()
	{
		return reverse;
	}
	/**
	 * @param reverse the reverse to set
	 */
	public void setReverse(boolean reverse)
	{
		this.reverse = reverse;
	}
	
	@Override
	protected void onLoad()
	{
		super.onLoad();
		
		Animation a = animation == null ? null : Animation.valueOf(animation);
		ViewTransition vt = new ViewTransition(view, a , reverse);
		ViewClickHandler vch = new ViewClickHandler(vt);
		
		this.addClickHandler(vch);
	}
}
