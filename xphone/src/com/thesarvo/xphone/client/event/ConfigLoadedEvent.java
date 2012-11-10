package com.thesarvo.xphone.client.event;

import com.thesarvo.xphone.client.model.Config;

public class ConfigLoadedEvent extends XPhoneEvent
{

	public ConfigLoadedEvent(Config subject)
	{
		super(subject);
	}
	
	public Config getConfig()
	{
		return (Config) getSubject();
	}

}
