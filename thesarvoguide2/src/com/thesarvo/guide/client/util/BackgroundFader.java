package com.thesarvo.guide.client.util;

import java.math.BigDecimal;

import com.google.gwt.animation.client.Animation;
import com.google.gwt.dom.client.Element;
import com.thesarvo.guide.client.phototopo.Console;



public class BackgroundFader extends Animation
{
	private Element element;

	private RGB target;
	private RGB base;

	public BackgroundFader(Element element)
	{
		this.element = element;
	}

	@Override
	protected void onUpdate(double progress)
	{
		
		RGB interp = RGB.interpolate(base, target, progress);
		String hex = interp.toHexString();
		Console.log("onUpdate" + progress + " => " + hex);
		element.getStyle().setBackgroundColor(hex);
	}

	@Override
	protected void onComplete()
	{
		Console.log("onComplete");
		super.onComplete();
		element.getStyle().setBackgroundColor(target.toHexString());
	}

	public void fade(int duration, RGB base, RGB target)
	{
		Console.log("fade");
		
		this.target = target;
		this.base = base;
		
		run(duration);
	}
}
