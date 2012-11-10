package com.thesarvo.confluence;

import org.w3c.dom.Node;

public abstract class GuideNode
{
	public abstract void render(StringBuffer ret, Node node, String contextPath);
	
	public abstract void renderForEdit(StringBuffer ret, Node node, String contextPath);
	
	
}
