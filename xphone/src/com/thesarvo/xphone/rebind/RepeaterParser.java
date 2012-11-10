package com.thesarvo.xphone.rebind;

import com.google.gwt.core.ext.UnableToCompleteException;
import com.google.gwt.core.ext.typeinfo.JClassType;
import com.google.gwt.uibinder.elementparsers.ElementParser;
import com.google.gwt.uibinder.rebind.UiBinderWriter;
import com.google.gwt.uibinder.rebind.XMLElement;

public class RepeaterParser implements ElementParser
{

	@Override
	public void parse(XMLElement elem, String fieldName, JClassType type,
			UiBinderWriter writer) throws UnableToCompleteException
	{

		// String childFieldName = writer.parseElementToField(child);
		// JClassType jct = writer.findFieldType(child);
		// writer.addStatement("%1$s.add(%2$s);", fieldName, childFieldName);

		// UiBinderWriter child = new UiBinderWriter(writer.get, implClassName,
		// templatePath, oracle, logger, fieldManager, messagesWriter)
		// writer.setFieldInitializer(fieldName, factoryMethod)

		writer.addStatement("%1$s.setChildFactory(", fieldName);

		writer
				.addStatement("new com.thesarvo.xphone.client.ui.widgets.simplebind.Repeater.ChildFactory(){");
		writer
				.addStatement("public java.util.List<Widget> create(com.thesarvo.xphone.client.ui.widgets.simplebind.Repeater parent) {");
		// writer.addStatement("return GWT.create(%1$s.class);",
		// jct.getQualifiedSourceName() );
		// writer.addStatement("return new %1$s();",
		// jct.getQualifiedSourceName() );

		writer.addStatement("java.util.List<Widget> ret = new java.util.ArrayList<Widget>();");


		writer.startDelegation();

		// Parse children.
		for (XMLElement child : elem.consumeChildElements())
		{
			if (!writer.isWidgetElement(child))
			{
				writer.die("%s can contain only widgets, but found %s", elem,
						child);
			}

			String field = writer.parseElementToField(child);
			//writer.lookupField(field).write(niceWriter);
			writer.addStatement("ret.add(%1$s);", field);
		}

		String statements = writer.endDelegation();

		

		writer.addStatement(statements);

		writer.addStatement("return ret;");
		writer.addStatement("} } );");

		// /writer.addStatement("} end");
	}

}
