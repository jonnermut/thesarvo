package com.thesarvo.guide.client.util;

import java.util.logging.Level;

public abstract class Logger
{
	static final java.util.logging.Logger log = java.util.logging.Logger.getLogger("MainLog");
	
	public static void debug(String msg)
	{
		log.log(Level.INFO, msg);
		//PhoneGap.log(msg);
	}
	
	public static void error(String msg, Throwable t)
	{
		log.log(Level.SEVERE, msg, t);
		
		
	}
}
