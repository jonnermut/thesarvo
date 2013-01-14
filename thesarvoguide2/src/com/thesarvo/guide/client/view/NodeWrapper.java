package com.thesarvo.guide.client.view;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.RunAsyncCallback;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.Guide;
import com.thesarvo.guide.client.model.NodeType;
import com.thesarvo.guide.client.view.node.AddControls;
import com.thesarvo.guide.client.view.node.ClimbEditNode;
import com.thesarvo.guide.client.view.node.ClimbReadNode;
import com.thesarvo.guide.client.view.node.EditControls;
import com.thesarvo.guide.client.view.node.EditNode;
import com.thesarvo.guide.client.view.node.GpsEditNode;
import com.thesarvo.guide.client.view.node.GpsReadNode;
import com.thesarvo.guide.client.view.node.HeaderEditNode;
import com.thesarvo.guide.client.view.node.HeaderReadNode;
import com.thesarvo.guide.client.view.node.ImageEditNode;
import com.thesarvo.guide.client.view.node.ImageReadNode;
import com.thesarvo.guide.client.view.node.ReadNode;
import com.thesarvo.guide.client.view.node.TextEditNode;
import com.thesarvo.guide.client.view.node.TextReadNode;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlSimpleModel;


public class NodeWrapper extends FlowPanel
{
	Node node;
	
	//FlowPanel fp = new FlowPanel();
	ReadNode readNode;
	EditNode editNode=null;
	
	EditControls editControls = null;
	
	FlowPanel inner = new FlowPanel();
	
	AddControls addControls = null;
	
	boolean deleteOnCancel = false;
	
	Guide guide;
	
	public NodeWrapper(Node node, Guide guide)
	{
		this.node = node;
		this.guide = guide;
		//this.add(fp);
		
		this.add(inner);
				
		
		readNode = setupReadNode();
		if (readNode!=null)
			//this.getChildren().insert(readNode,0);
			inner.add(readNode);
		
		
		// TODO - not working
		ClickHandler ch = new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				Controller.get().onEdit(NodeWrapper.this, false);
			}
		};
		this.addHandler(ch, ClickEvent.getType());
	}
	

	
	public EditNode getEditNode()
	{
//		if (editNode==null)
//		{
//			editNode = setupEditNode();
//			if (editNode!=null)
//				inner.insert(editNode, 0);
//		}
		return editNode;
	}
	
	public void setupEditNode()
	{
		if (editControls == null)
		{
			editControls = new EditControls(NodeWrapper.this);
			inner.add(editControls);
		}
		
		GWT.runAsync(new RunAsyncCallback()
		{
			
			@Override
			public void onSuccess()
			{
				if (editNode==null)
				{
					editNode = createEditNode();
					if (editNode!=null)
						inner.insert(editNode, 0);
				}
				
				

				
			}
			
			@Override
			public void onFailure(Throwable reason)
			{
				Window.alert("Could not load editing code!");
				
			}
		});
		

	}
	
	private EditNode createEditNode()
	{
		NodeType t = getNodeType();
		
		EditNode ret = null;
		
		switch(t)
		{
			case climb:
			case problem:
				ret = new ClimbEditNode();
				break;
			case text:
				ret = new TextEditNode();
				break;
			case gps:
				ret = new GpsEditNode();
				break;
			case header:
				ret = new HeaderEditNode();
				break;
			case image:
				ret = new ImageEditNode();
				break;
				
		}
		
		// TODO: clone node etc
		if (ret!=null)
		{
			// FIXME
			XmlSimpleModel xsm = new XmlSimpleModel(node);
			ret.setModel(xsm);
			ret.init();

			ret.setVisible(false);

		}
		
		return ret;
	}

	ReadNode setupReadNode()
	{
		NodeType t = getNodeType();
		
		ReadNode ret = null;
		
		switch(t)
		{
			case climb:
			case problem:
				ret = new ClimbReadNode();
				break;
			case text:
				ret = new TextReadNode();
				break;
			case gps:
				ret = new GpsReadNode();
				break;
			case header:
				ret = new HeaderReadNode();
				break;
			case image:
				ret = new ImageReadNode();
				break;
				
		}
		
		XmlSimpleModel xsm = new XmlSimpleModel(node);
		ret.setModel(xsm);
		ret.init();
		
		return ret;
	}
	
	public NodeType getNodeType()
	{
		String type = node.getNodeName();
		return NodeType.valueOf(type);
	}

	public void setEditMode(boolean editMode)
	{
		if (editMode)
		{
			inner.setStyleName(Resources.INSTANCE.s().editMode());
			getEditControls().setVisible(true);
			getEditControls().setEditing(false);
			getAddControls().setVisible(true);
		}
		else
		{
			inner.setStyleName("");
			getEditControls().setVisible(false);
			getAddControls().setVisible(false);
		}
		
	}
	
	public AddControls getAddControls()
	{
		if (addControls==null)
		{
			addControls = new AddControls(this);
			this.add(addControls);
		}
		return addControls;
	}



	public void setEditing(boolean editing)
	{
		if (editing)
		{
			inner.setStyleName(Resources.INSTANCE.s().editing());
		}
		else
		{
			inner.setStyleName(Resources.INSTANCE.s().editMode());
		}
		
		readNode.setVisible(!editing);
		
		// force create
		if (editing)
		{
			//setupEditNode();
			getEditNode().updateAllWidgets();
		}
		else
		{
			readNode.updateAllWidgets();
			
		}
		readNode.setEditing(editing);
		
		if (editNode!=null)
		{
			editNode.setVisible(editing);
			
			editNode.setEditing(editing);
		}
		
		
		getEditControls().setEditing(editing);
	}

	private EditControls getEditControls()
	{

		return editControls;
	}

	public void saveChanges()
	{
		if (editNode != null)
		{
			editNode.setModelValuesFromWidgets();
		}
	}

	public void update()
	{
		if (readNode!=null)
			readNode.updateAllWidgets();
		if (editNode!=null)
			editNode.updateAllWidgets();
	}



	/**
	 * @return the readNode
	 */
	public ReadNode getReadNode()
	{
		return readNode;
	}



	public Node getNode()
	{
		return node; 
	}



	/**
	 * @return the deleteOnCancel
	 */
	public boolean isDeleteOnCancel()
	{
		return deleteOnCancel;
	}



	/**
	 * @param deleteOnCancel the deleteOnCancel to set
	 */
	public void setDeleteOnCancel(boolean deleteOnCancel)
	{
		this.deleteOnCancel = deleteOnCancel;
	}



	public void setNode(Node n)
	{
		this.node = n;
		((XmlSimpleModel) this.readNode.getModel()).setNode(n);
		if (this.editNode != null && this.editNode.getModel() != null)
		{
			this.editNode.getModel().setNode(n);
		}
		
	}



	/**
	 * @return the guide
	 */
	public Guide getGuide()
	{
		return guide;
	}
}
