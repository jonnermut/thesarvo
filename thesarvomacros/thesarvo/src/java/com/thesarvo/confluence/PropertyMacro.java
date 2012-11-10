/*
 * Created on 14/02/2005
 * author jnermut
 */
package com.thesarvo.confluence;

import java.io.IOException;
import java.io.Writer;

import org.radeox.macro.parameter.MacroParameter;

import com.atlassian.renderer.macro.BaseMacro;


/**
 * PropertyMacro
 *
 * @author jnermut
 *
 */
public class PropertyMacro extends BaseMacro
{

	/* (non-Javadoc)
	 * @see org.radeox.macro.BaseMacro#getName()
	 */
	public String getName()
	{
		// TODO Auto-generated method stub
		return "PropertyMacro";
	}

	/* (non-Javadoc)
	 * @see org.radeox.macro.BaseMacro#execute(java.io.Writer, org.radeox.macro.parameter.MacroParameter)
	 */
	public void execute(Writer arg0, MacroParameter arg1) throws IllegalArgumentException, IOException
	{
		System.setProperty("java.awt.headless","true");
		
	}

}
