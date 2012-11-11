package com.thesarvo.guide.client.view.res;

import com.google.gwt.core.client.GWT;
import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.resources.client.CssResource.NotStrict;

public interface Resources extends ClientBundle
{
	public static final Resources INSTANCE =  GWT.create(Resources.class);
	
	//public JqtTheme x();
	
	@NotStrict
	@Source("guide.css")
	public GuideStyle s();
	
//	@Source("0star.gif")
//	ImageResource star0();
//	
//	@Source("1star.gif")
//	ImageResource star1();
//	
//	@Source("2star.gif")
//	ImageResource star2();
//	
//	@Source("3star.gif")
//	ImageResource star3();

	@Source("rock1.png")
	ImageResource rock();

	@Source("sun1.png")
	ImageResource sun();

	@Source("walk1.png")
	ImageResource walk();

	@Source("rock2.png")
	ImageResource rockSmall();

	@Source("sun2.png")
	ImageResource sunSmall();

	@Source("walk2.png")
	ImageResource walkSmall();
	
	@Source("ajax-loader.gif") 
	ImageResource loading();

	//@Source("UITableNextButton.png")
	//DataResource uiTableNextButtonImg();
	
}
