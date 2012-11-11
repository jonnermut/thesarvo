package com.thesarvo.guide.client.controller;

import java.util.Date;

import com.google.gwt.i18n.client.DateTimeFormat;
import com.thesarvo.guide.client.util.Pattern;

public class DateFixer
{
	
	public static String fixDates(String text)
	{
		text += " ";
		
		DateTimeFormat outputFormat1 = DateTimeFormat.getFormat("MMM yyyy");
		DateTimeFormat outputFormat2 = DateTimeFormat.getFormat("d MMM yyyy");

		text = text.replace("Sept ", "Sep ");
		text = text.replace("Sept/", "Sep ");
		
		Pattern pattern1 = new Pattern("(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.*[/ -](\\d{2})(?=\\D)");
		DateTimeFormat format1 = DateTimeFormat.getFormat("MMM yy");

		text = doReplace(text, pattern1, format1, outputFormat1);
		
		pattern1 = new Pattern("(January|February|March|April|June|July|August|September|October|November|December)\\.*[/ -](\\d{2})(?=\\D)");
		format1 = DateTimeFormat.getFormat("MMMM yy");
		
		text = doReplace(text, pattern1, format1, outputFormat1);

		pattern1 = new Pattern("(January|February|March|April|June|July|August|September|October|November|December)\\.*[/ -](\\d{4})");
		format1 = DateTimeFormat.getFormat("MMMM yyyy");
		
		text = doReplace(text, pattern1, format1, outputFormat1);

		
		pattern1 = new Pattern("(\\d{1,2})[/ -](\\d{1,2})[/ -](\\d{4})");
		format1 = DateTimeFormat.getFormat("dd MM yyyy");
		
		text = doReplace(text, pattern1, format1, outputFormat2);

		
		pattern1 = new Pattern("(\\d{1,2})[/ -](\\d{1,2})[/ -](\\d{2})(?=\\D)");
		format1 = DateTimeFormat.getFormat("dd MM yy");
		
		text = doReplace(text, pattern1, format1, outputFormat2);


		pattern1 = new Pattern("(\\d{1,2})[/ -](\\d{2})(?=\\D)");
		format1 = DateTimeFormat.getFormat("MM yy");
		
		text = doReplace(text, pattern1, format1, outputFormat1);

		pattern1 = new Pattern("(\\d{1,2})[/ -](\\d{4})");
		format1 = DateTimeFormat.getFormat("MM yyyy");
		
		text = doReplace(text, pattern1, format1, outputFormat1);
		
		
		
		return text;
		
	}
	
	public static String doReplace(String text, Pattern p, DateTimeFormat in, DateTimeFormat out)
	{
		String[] match = p.matchAsArray(text);
		
		if (match!=null && match.length > 0)
		{
			String d = match[1] + " " + match[2];
			if (match.length > 3)
				d += " " + match[3];
			
			Date date = in.parse(d);
			String o = out.format(date);
			text = text.replace(match[0], o);
		}
		
		return text;
	}
}
