package com.thesarvo.xphone.rebind;

import java.util.Collection;

import com.google.gwt.core.ext.UnableToCompleteException;
import com.google.gwt.core.ext.typeinfo.JClassType;
import com.google.gwt.uibinder.elementparsers.ElementParser;
import com.google.gwt.uibinder.rebind.UiBinderWriter;
import com.google.gwt.uibinder.rebind.XMLElement;
import com.google.gwt.uibinder.rebind.XMLElement.Interpreter;

public class FlexTableParser implements ElementParser
{

	@Override
	public void parse(XMLElement elem, String fieldName, JClassType type,
			UiBinderWriter writer) throws UnableToCompleteException
	{
		
		if (elem.hasAttribute("columns"))
		{
			String c = elem.consumeRequiredDoubleAttribute("columns");
		    writer.addStatement("%1$s.setColumns(%2$s);", fieldName, c);
		}
		
		Collection<XMLElement> elems = elem.consumeChildElements(new Interpreter<Boolean>()
		{
			
			@Override
			public Boolean interpretElement(XMLElement elem)
					throws UnableToCompleteException
			{
				return elem.getLocalName().equals("repeater") && elem.getNamespaceUri().equals(elem.getParent().getNamespaceUri());
			}
		});
		
		
	}

}
