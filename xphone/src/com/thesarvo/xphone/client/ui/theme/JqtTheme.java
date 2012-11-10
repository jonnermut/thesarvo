package com.thesarvo.xphone.client.ui.theme;

import com.google.gwt.core.client.GWT;
import com.google.gwt.resources.client.CssResource;
import com.google.gwt.resources.client.DataResource;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.resources.client.ImageResource.ImageOptions;
import com.google.gwt.resources.client.ImageResource.RepeatStyle;


public interface JqtTheme extends Resources
{
	public static final Resources INSTANCE =  GWT.create(JqtTheme.class);
	
	@Source("jqt/theme.css")
	@CssResource.NotStrict
	public ThemeStyle themeStyle();
	
	@Source("jqt/img/toolbar.png")
	@ImageOptions(repeatStyle=RepeatStyle.Horizontal)
	ImageResource toolbarImg();
	
	@Source("jqt/img/button.png")
	//ImageResource buttonImg();
	DataResource buttonImg(); 
	
	@Source("jqt/img/UINavigationBarDoneButton.png")
	DataResource blueButtonImg(); 

	@Source("jqt/img/chevron.png")
	DataResource chevronImg();

	@Source("jqt/img/chevron_circle.png")
	DataResource chevronCircleImg();

	@Source("jqt/img/back_button.png")
	DataResource backButtonImg(); 
	
	@Source("jqt/img/back_button_clicked.png")
	DataResource backButtonClickedImg(); 
	
	@Source("jqt/img/expandoOpenButton.png")
	DataResource expandoOpenButtonImg(); 

	@Source("jqt/img/expandoCloseButton.png")
	DataResource expandoCloseButtonImg(); 
	
}
