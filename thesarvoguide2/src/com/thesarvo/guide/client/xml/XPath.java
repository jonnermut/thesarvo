package com.thesarvo.guide.client.xml;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.google.gwt.xml.client.Text;

/**
 * Very simple naive and manual implentations of some xpath methods
 * Could be massively improved by wrapping the native xpath stuff which exists in most browsers
 * 
 * @author jon
 *
 */
public class XPath 
{



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
		if (child != null && child.getNodeType()==3)
		{
			child.setNodeValue(text);
		}
		else
		{
			Text txtNode = node.getOwnerDocument().createTextNode(text);
			node.appendChild(txtNode);
		}
			
	}
	
	public static  List<Node> getChildren(Node node)
	{
		return XPath.nodeListToList(node.getChildNodes());
	}
	
	public static  List<Element> getElementChildren(Node node)
	{
		NodeList childNodes = node.getChildNodes();
		ArrayList<Element> ret = new ArrayList<Element>(childNodes.getLength());
		for (int i=0;i<childNodes.getLength();i++)
		{
			Node n = childNodes.item(i);
			if (n instanceof Element)
				ret.add((Element)n);
		}
		return ret;
	}
	
	public static void removeNodes(Node node, String name)
	{
		for (int i=node.getChildNodes().getLength() -1;i>=0;i--)
		{
			Node child = node.getChildNodes().item(i);
			if (child.getNodeName().equals(name))
				node.removeChild( child );
				
		}
	}
	
	public  static List<Node> nodeListToList(NodeList childNodes) 
	{
		ArrayList<Node> ret = new ArrayList<Node>(childNodes.getLength());
		for (int i=0;i<childNodes.getLength();i++)
			ret.add(childNodes.item(i));
		return ret;
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

	public static List<String> selectNodesText(Node node, String path) 
	{
		List<String> ret = new ArrayList<String>();
		List<Node> nodes = selectNodes( node,  path);
		for (Node n : nodes)
			ret.add( getText(n));
		
		return ret;
	}
	
	public static List<Node> selectNodes(Node node, String path) 
	{
		List<Node> ret = new ArrayList<Node>();
		
		if (path.contains("/"))
		{
			String[] segments = path.split("/");
			
			List<Node> temp = new ArrayList<Node>();
			temp.add(node);
			for (String seg : segments)
			{
				List<Node> next = new ArrayList<Node>(); 
				for (Node parent: temp)
				{
					next.addAll( selectNodes(parent, seg));
				}
				temp = next;
			}
			return temp;
		}
		else
		{
			NodeList nl = node.getChildNodes();
			for (int i=0; i < nl.getLength(); i++)
			{
				Node child = nl.item(i);
				if (child.getNodeName() != null && child.getNodeName().equals(path))
					ret.add(child);
			}
			return ret;
		}
	}

	public static void setAttr(Node node, String key, String val) 
	{
		if (key.startsWith("@"))
			key = key.substring(1);
		
		((Element)node).setAttribute(key, val);
		
	}

}
