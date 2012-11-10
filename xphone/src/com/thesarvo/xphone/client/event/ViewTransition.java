package com.thesarvo.xphone.client.event;

import com.thesarvo.xphone.client.ui.Animation;

public class ViewTransition
{
	String toViewId = null;
	String toViewTitle = null;
	Animation animation = Animation.slide;
	boolean reverse = false;
	
	public ViewTransition(String toViewId, Animation animation, boolean reverse)
	{
		super();
		this.toViewId = toViewId;
		this.animation = animation;
		this.reverse = reverse;
	}
	
	public ViewTransition(String toViewId, Animation animation, boolean reverse, String toViewTitle)
	{
		this.toViewId = toViewId;
		this.animation = animation;
		this.reverse = reverse;
		
		this.toViewTitle = toViewTitle;
	}

	public ViewTransition(String toViewId)
	{
		super();
		this.toViewId = toViewId;
	}

	/**
	 * @return the toViewId
	 */
	public String getToViewId()
	{
		return toViewId;
	}

	/**
	 * @param toViewId the toViewId to set
	 */
	public void setToViewId(String toViewId)
	{
		this.toViewId = toViewId;
	}

	/**
	 * @return the animation
	 */
	public Animation getAnimation()
	{
		return animation;
	}

	/**
	 * @param animation the animation to set
	 */
	public void setAnimation(Animation animation)
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

	/**
	 * @return the toViewTitle
	 */
	public String getToViewTitle()
	{
		return toViewTitle;
	}
	
	
}
