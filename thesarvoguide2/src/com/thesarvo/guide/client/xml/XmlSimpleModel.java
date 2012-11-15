package com.thesarvo.guide.client.xml;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;

public class XmlSimpleModel 
{
	Node node = null;
	
	public XmlSimpleModel(Node node) 
	{
		this.node = node;
	}

	/**
	 * @return the node
	 */
	public Node getNode() 
	{
		return node;
	}

	/**
	 * @param node the node to set
	 */
	public void setNode(Node node) 
	{
		this.node = node;
	}

	public Node getXml() 
	{
		return node;
	}

	public void put(String key, String val) 
	{
		if (key.startsWith("@"))
			XPath.setAttr(node, key, val);
		else if (key.equals("."))
			XPath.setText(node, val);
		
	}

	public void createNode(String name, String val) 
	{
		Element el = node.getOwnerDocument().createElement(name);
		XPath.setText(el, val);
		node.appendChild(el);
		
	}
	


	public String get(String key) 
	{
		if (key.startsWith("@"))
		{
			return XPath.getAttr(node, key);
		}
		else if (key.equals("."))
		{
			return XPath.getText(node);
			
		}
		
		return "";
	}

	public List<XmlSimpleModel> getList(String path) 
	{
		
		List<Node> nodes = XPath.selectNodes(node, path);
		ArrayList<XmlSimpleModel> ret = new ArrayList<XmlSimpleModel>(nodes.size());
		for (Node node : nodes)
		{
			ret.add(new XmlSimpleModel(node));
		}
		return ret;
	}

}
