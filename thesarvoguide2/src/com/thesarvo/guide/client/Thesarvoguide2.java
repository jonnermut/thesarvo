package com.thesarvo.guide.client;

import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.dom.client.Element;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.xml.client.Document;
import com.google.web.bindery.event.shared.EventBus;
import com.google.web.bindery.event.shared.SimpleEventBus;
import com.thesarvo.guide.client.application.Application;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlService;

/**
 * Entry point classes define <code>onModuleLoad()</code>.
 */
public class Thesarvoguide2 implements EntryPoint 
{

	
	
	/**
	 * This is the entry point method.
	 */
	public void onModuleLoad()
	{
		//Window.alert("Hello world!");
		
		boolean testMode = Window.Location.getHost().startsWith("127.0.0.1");
		
		//Log.setUncaughtExceptionHandler();
		
		// build up our application objects and wire them
		Application app = new Application();
		EventBus eventBus = new SimpleEventBus();
		Controller controller = new Controller(eventBus);
		app.setController(controller);
		app.setEventBus(eventBus);
		
		//app.setConfigService(new ConfigService(eventBus));
	
		//String location = Window.Location.getPath();
		//int idx = location.indexOf("/display");
		String servUrl = getVarGuideServletUrl();
		if (servUrl!=null)
		{
			if (!servUrl.endsWith("/"))
				servUrl += "/";
			
			controller.setServletUrl(servUrl);
		}
		
		
		Resources.INSTANCE.s().ensureInjected();
		
		RootPanel rootPanel = RootPanel.get("rootdiv");
				
		if (rootPanel!=null)
		{
		
			/*
			 * TODO - fix this up
			 
			
			if (BrowserUtil.isMobileBrowser())
			{
				if (rootPanel!=null)
					rootPanel.setVisible(false);
				
				controller.initNativeNavBar();
				setupMobile(rootPanel);
			}
			*/
			
			//controller.setViewContainer(rootPanel);
			//controller.setMultiPage(true);
			
			//Controller.get().showView("home");
			
			//app.getConfigService().loadConfig("../data/config.xml", "home");
			
			//Window.scrollTo(0, 1);
		}
		else
		{
			rootPanel = RootPanel.get("guidediv");
			if (rootPanel==null)
				rootPanel = RootPanel.get();
			
			controller.setViewContainer(rootPanel);
			controller.setMultiPage(false);
		
			String xml = getVarGuideXml();
			
			boolean allowEdit = false;
					
			Element editLink = com.google.gwt.dom.client.Document.get().getElementById("editPageLink");
			if (editLink !=null)
			{
				String user = getVarGuideUser();
				if (user == null || ( !user.equals("admin") && !user.equals("jnermut")))
				{
					WidgetUtil.setVisible(editLink, false);
				}
				
				
				allowEdit = true;
			}
			
			if (xml!=null)
			{
				
				Document doc = XmlService.parseXml(xml);	
				
				String id = getVarGuidePageid();
				
				controller.getGuideXmlCache().put(id, doc);
				GuideView gv = controller.createGuideView(id, doc);
				
				//guide.setGuideName(getVarGuidePageName());

				controller.setCurrentView(gv, id);
				
				controller.setCanEdit(testMode || (getVarGuideAllowEdit() && allowEdit) );
				controller.setUser(getVarGuideUser());
				
				//controller.showGuide();
				rootPanel.add(gv);
				
			}
			else
			{
				Window.alert("Error: missing xml data");
			}
			
		}

	}

	/*
	 * TODO - resurrect/
	 
	
	private void setupMobile(final RootPanel rootPanel)
	{
		GWT.runAsync(new RunAsyncCallback()
		{
			
			@Override
			public void onSuccess()
			{
				//NativeNavigationBar nnb = new NativeNavigationBar();
				//nnb.createNavBar();
				//nnb.setNavBar("Home", "home");
				//nnb.setNavBar("test 1", "test1");
				//nnb.setNavBar("test 2", "test2");
		
				JqtTheme.INSTANCE.xphoneStyle().ensureInjected();
				JqtTheme.INSTANCE.themeStyle().ensureInjected();
							
				if (rootPanel!=null)
				{
					rootPanel.getElement().getStyle().setBackgroundColor("white");
					rootPanel.setVisible(true);
				}
			}
			
			@Override
			public void onFailure(Throwable reason)
			{
			}
		});
	}
	*/
	
	  private native String getVarGuideXml() /*-{
		if ($wnd.guide_xml)
	    	return $wnd.guide_xml;
	    return null; 
	  }-*/;

	  private native boolean getVarGuideAllowEdit() /*-{
	    if ($wnd.guide_allowEdit)
	    	return $wnd.guide_allowEdit;
	    return false; 
	  }-*/;

	  
	  private native String getVarGuideServletUrl() /*-{
	    if ($wnd.guide_allowEdit)
	    	return $wnd.guide_servletUrl;
	    return null; 
	  }-*/;
	  
	  
	  private native String getVarGuidePageid() /*-{
	    if ($wnd.guide_pageid)
	    	return $wnd.guide_pageid;
	    return null; 
	  }-*/;

	  private native String getVarGuidePageName() /*-{
	    if ($wnd.guide_pagename)
	    	return $wnd.guide_pagename;
	    return null; 
	  }-*/;

	  
	  private native String getVarGuideUser() /*-{
	    if ($wnd.guide_user)
	    	return $wnd.guide_user;
	    return null; 
	  }-*/;
}
