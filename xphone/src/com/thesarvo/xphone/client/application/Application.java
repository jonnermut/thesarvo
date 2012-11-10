package com.thesarvo.xphone.client.application;

import com.thesarvo.xphone.client.controller.Controller;
import com.thesarvo.xphone.client.event.EventBus;
import com.thesarvo.xphone.client.model.ConfigService;

/**
 * Singleton to hold all the bits and pieces of your app.
 * Extend it to add services.
 * 
 * The instance is initialised in the constructor.
 * 
 * Various bits of xphone rely on the static Application.get().getEventBus() etc
 * 
 * @author jnermut
 *
 */
public class Application
{

	static Application instance = null;
	EventBus eventBus = null;
	Controller controller = null;
	ConfigService configService = null;
	
	public Application()
	{
		instance = this;
	}
	
	public static Application get()
	{
		if (instance==null)
			instance = new Application();
		
		return instance;
	}

	/**
	 * @return the eventBus
	 */
	public EventBus getEventBus()
	{
		return eventBus;
	}

	/**
	 * @param eventBus the eventBus to set
	 */
	public void setEventBus(EventBus eventBus)
	{
		this.eventBus = eventBus;
	}

	/**
	 * @return the controller
	 */
	public Controller getController()
	{
		return controller;
	}

	/**
	 * @param controller the controller to set
	 */
	public void setController(Controller controller)
	{
		this.controller = controller;
	}

	/**
	 * @return the configService
	 */
	public ConfigService getConfigService()
	{
		return configService;
	}

	/**
	 * @param configService the configService to set
	 */
	public void setConfigService(ConfigService configService)
	{
		this.configService = configService;
	}
	
}
