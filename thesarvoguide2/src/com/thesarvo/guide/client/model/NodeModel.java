package com.thesarvo.guide.client.model;

import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class NodeModel
{
	XmlSimpleModel model = null;
	
	public NodeModel()
	{
	}
	
	NodeModel(XmlSimpleModel xsm)
	{
		this.model = xsm;
	}
}
