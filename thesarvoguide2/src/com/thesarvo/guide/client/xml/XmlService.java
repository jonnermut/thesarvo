package com.thesarvo.guide.client.xml;

import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.XMLParser;

public class XmlService 
{

	public static Document parseXml(String xml) 
	{
		Document messageDom = XMLParser.parse(xml);
		return messageDom;
	}

}
