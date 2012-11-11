package com.thesarvo.guide.client.view.node;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.FlexTable;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;


public class GpsEditNode extends EditNode
{
	@UiField
	FlexTable gpsTable;
	
	@UiField
	Button addButton;
	
	List<Button> buttonsWithHandler = new ArrayList<Button>();

	interface MyUiBinder extends UiBinder<Widget, GpsEditNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public GpsEditNode()
	{		
	}

	@Override
	public void init()
	{
		initWidget(uiBinder.createAndBindUi(this));	
		
		super.init();
		
		addButton.addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				((XmlSimpleModel)getModel()).createNode("point", "");
				updateAllWidgets();	
			}
		});
		
	}
	
	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();
		
		DeferredCommand.addCommand(new Command()
		{
			
			@Override
			public void execute()
			{
				// TODO major hacks - FIXME!
				for (int i=1;i<gpsTable.getRowCount();i++)
				{
					if (gpsTable.getCellCount(i) > 0)
					{
						/* FIXME - broken api
						
						Widget w = gpsTable.getWidget(i, gpsTable.getColumns()-1);
						if (w!=null && w instanceof Button)
						{
							if (! buttonsWithHandler.contains(w))
							{
								((Button) w).addClickHandler(new RemoveHandler());
								buttonsWithHandler.add((Button) w);
							}
						}
						*/
					}
				}				
			}
		});
	}
	
//	@UiHandler("addButton")
//	public void onClick(ClickEvent event)
//	{
//		((XmlSimpleModel)this.getModel()).createNode("point", "");
//		updateAllWidgets();
//	}
//
//	@UiHandler("removeButton")
//	void onRemoveClick(ClickEvent e)
//	{
//		if ( Window.confirm("Are you sure you want to remove this? You wont be able to undo") )
//			Controller.get().removeGpsRow(null);
//	}
	
//	public void removeRow(Integer row)
//	{
//		List<Node> nodes = XPath.selectNodes( ((XmlSimpleModel) this.getModel()).getXml(), "point" );
//		
//		if (nodes!=null && nodes.size() > row)
//		{
//			Node n = nodes.get(row);
//			n.getParentNode().removeChild(n);
//			
//			this.updateAllWidgets();
//		}
//	}
	
	private final class RemoveHandler implements ClickHandler
	{
//		int row;
//		
//		public RemoveHandler(int i)
//		{
//			row = i;
//		}
		
		@Override
		public void onClick(ClickEvent event)
		{
			/* FIXME
			if ( Window.confirm("Are you sure you want to remove this? You wont be able to undo") )
			{
				Integer row = (Integer) ((BoundButton)event.getSource()).getValue();
				//int row = Integer.valueOf(srow);
				
				List<Node> nodes = XPath.selectNodes(((XmlSimpleModel)getModel()).getXml(), "point");
				if (nodes!=null && nodes.size() > row)
				{
					nodes.get(row).getParentNode().removeChild(nodes.get(row));
					updateAllWidgets();
				}		
			}
			*/
		}
	}	
}
