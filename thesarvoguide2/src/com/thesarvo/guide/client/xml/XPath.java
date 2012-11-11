package com.thesarvo.guide.client.xml;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.google.gwt.xml.client.Text;

public class XPath 
{

	public static List<Node> selectNodes(Document document, String string) 
	{
		// FIXME - implement
		return new ArrayList<Node>();
	}

	public static Element selectSingleNode(Document xml, String string) 
	{
		// FIXME - implement
		return null;
	}

	public static String getText(Node c) 
	{
		Node child = c.getFirstChild();
		return child == null ? "" : child.getNodeValue();
	}

	public static void setText(Node node, String text) 
	{
//		Element el = (Element)node;
//		NodeList nl = el.getChildNodes();
//		for (int i=0;i<nl.getLength();i++)
//		{
//			Node n = nl.item(i);
//			System.out.println(n);
//		}
		
		//node.setNodeValue(text);
		
		Node child = node.getFirstChild();
		if (child != null )
		{
			child.setNodeValue(text);
		}
			
	}
	
	public static String getAttr(Node node, String name)
	{
		if (name.startsWith("@"))
			name = name.substring(1);
		
		String ret = ((Element)node).getAttribute(name);
		if (ret==null)
			ret = "";
		
		return ret;
	}

	public static List<Node> selectNodes(Node xml, String string) 
	{
		// FIXME Auto-generated method stub
		return null;
	}

	public static void setAttr(Node node, String key, String val) 
	{
		if (key.startsWith("@"))
			key = key.substring(1);
		
		((Element)node).setAttribute(key, val);
		
	}

}
