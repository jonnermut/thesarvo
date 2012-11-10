package com.thesarvo.guide.client.controller;

import com.google.gwt.junit.client.GWTTestCase;

import junit.framework.TestCase;

public class DateFixerTest extends GWTTestCase
{
	
	String test = "Doug McConnell February 2003. r, Mar 95. n, 14 Mar 95  29-4-2003 9/12/2003 9/12/03 19/12/03 Jul/84 Nov/94 Nov/04";

	@Override
	public String getModuleName()
	{
		
		return "com.thesarvo.guide.Thesarvoguide";
	}

	public void testDateFixer()
	{
		String[] tests = new String[] {
				"Doug McConnell Feb 2003.",
				"Doug McConnell 19 Feb 2003.",
				"Doug McConnell 19 Sept 2003.",
				"Doug McConnell February 2003.",
				"Doug McConnell  Mar 95. n,",
				"Doug McConnell  14 Mar 95  ",
				"Doug McConnell 29-4-2003 ",
				"Doug McConnell 9/12/2003.",
				"Doug McConnell 9/12/03 ",
				"Doug McConnell 12/03 ",
				"Doug McConnell 19/12/03,",
				"Doug McConnell Jul/84 ",
				"Doug McConnell Nov/04",
				"Doug McConnell 13 Nov/04",
				
		};
		
		for (String t : tests)
		{
			String out = DateFixer.fixDates(t);
			System.out.println("In:  " + t);
			System.out.println("Out: " + out);
		}
		
		
	}
}
