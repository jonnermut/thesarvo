package com.thesarvo.guide.client.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.Scheduler;
import com.google.gwt.core.client.Scheduler.ScheduledCommand;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.NodeWrapper;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class Guide
{
	private List<NodeWrapper> nodeWrappers = new ArrayList<NodeWrapper>();
	private Map<String, NodeWrapper> nodesById = new HashMap<String, NodeWrapper>();

	private Document xml;
	
	private GuideView guideView; 
	NodeList nodeList;
	
	String guideId;
	String guideName;

	List<String> attachments = null;
	int maxId=0;
	
	List<NodeWrapper> deferredUpdates = new ArrayList<NodeWrapper>();
	private boolean autonumber = false;
	private int climbNumber = 1;

	public Guide(GuideView guideView)
	{
		this.guideView = guideView;
	}
	
	/**
	 * @return the nodeWrappers
	 */
	public List<NodeWrapper> getNodeWrappers()
	{
		return nodeWrappers;
	}

	/**
	 * @param nodeWrappers the nodeWrappers to set
	 */
	public void setNodeWrappers(List<NodeWrapper> nodeWrappers)
	{
		this.nodeWrappers = nodeWrappers;
	}

	/**
	 * @return the nodesById
	 */
	public Map<String, NodeWrapper> getNodesById()
	{
		return nodesById;
	}

	/**
	 * @param nodesById the nodesById to set
	 */
	public void setNodesById(Map<String, NodeWrapper> nodesById)
	{
		this.nodesById = nodesById;
	}

	/**
	 * @return the xml
	 */
	public Document getXml()
	{
		return xml;
	}

	/**
	 * @param xml the xml to set
	 */
	public void setXml(Document xml)
	{
		this.xml = xml;
	}

	/**
	 * @return the guideView
	 */
	public GuideView getGuideView()
	{
		return guideView;
	}

	/**
	 * @param guideView the guideView to set
	 */
	public void setGuideView(GuideView guideView)
	{
		this.guideView = guideView;
	}

	/**
	 * @return the nodeList
	 */
	public NodeList getNodeList()
	{
		return nodeList;
	}

	/**
	 * @param nodeList the nodeList to set
	 */
	public void setNodeList(NodeList nodeList)
	{
		this.nodeList = nodeList;
	}

	/**
	 * @return the guideId
	 */
	public String getGuideId()
	{
		return guideId;
	}

	/**
	 * @param guideId the guideId to set
	 */
	public void setGuideId(String guideId)
	{
		this.guideId = guideId;
	}

//	/**
//	 * @return the guideName
//	 */
//	public String getGuideName()
//	{
//		return guideName;
//	}
//
//	/**
//	 * @param guideName the guideName to set
//	 */
//	public void setGuideName(String guideName)
//	{
//		this.guideName = guideName;
//	}

	/**
	 * @return the attachments
	 */
	public List<String> getAttachments()
	{
		return attachments;
	}

	/**
	 * @param attachments the attachments to set
	 */
	public void setAttachments(List<String> attachments)
	{
		this.attachments = attachments;
	}

	/**
	 * @return the maxId
	 */
	public int getMaxId()
	{
		return maxId;
	}

	/**
	 * @param maxId the maxId to set
	 */
	public void setMaxId(int maxId)
	{
		this.maxId = maxId;
	}

	/**
	 * @return the deferredUpdates
	 */
	public List<NodeWrapper> getDeferredUpdates()
	{
		return deferredUpdates;
	}

	/**
	 * @param deferredUpdates the deferredUpdates to set
	 */
	public void setDeferredUpdates(List<NodeWrapper> deferredUpdates)
	{
		this.deferredUpdates = deferredUpdates;
	}

	public void addNodesToGuideView()
	{
		deferredUpdates.clear();
		nodesById.clear();
		nodeWrappers.clear();
		
		
		update();
		
		maxId = 0;
		
		//SetupNodes setupNodesCmd = new SetupNodes();
		//DeferredCommand.addCommand(setupNodesCmd);
		
		NodeWrapper scrollNw = null;
		
		Timer t = null;
		final String showId = Controller.get().getShowId();
		if (showId != null)
		{			
			t = new Timer()
			{				
				@Override
				public void run()
				{
					Controller.get().scrollToId(showId);					
				}
			};
			t.schedule(500);
		}
		
		int length = nodeList.getLength();
		for (int i=0;i<length;i++)
		{
			final Node n = nodeList.item(i);
			if (n instanceof Element && n.getNodeType() != Node.TEXT_NODE)
			{				
				
				Scheduler.get().scheduleDeferred(new ScheduledCommand()
				{
					@Override
					public void execute()
					{						
						NodeWrapper nw = createNodeWrapper(n, null);
						guideView.addNode(nw);	
						if (nw.getNodeType() == NodeType.image)
							deferredUpdates.add(nw);	

					}
				});
			}
		}
		
		
		
		Scheduler.get().scheduleDeferred(new ScheduledCommand()
		{
			
			@Override
			public void execute()
			{
				for (NodeWrapper nw : deferredUpdates)
				{
					nw.update();
				}
				
				//if (isCanEdit() && getUser()!=null && (getUser().equals("jnermut") || getUser().equals("dave") ) )
				
			}
		});
	}

	public void update()
	{
		setNodeList();	
		setOptions();
		autonumberIfNecessary();
	}

	public void setNodeList()
	{
		Node guideNode = xml.getLastChild();
		nodeList = guideNode.getChildNodes();
	}

	public void autonumberIfNecessary()
	{
		climbNumber = 1;
		if (this.autonumber)
		{
			for (int i = 0; i < nodeList.getLength(); i++)
			{
				Node node = nodeList.item(i);
				if (node instanceof Element && node.getNodeName().equals("climb") || node.getNodeName().equals("problem"))
				{
					((Element)node).setAttribute("number", climbNumber + ".");
					climbNumber ++ ;
				}
				
			}
			
			for (NodeWrapper nw : getNodeWrappers())
			{
				nw.update();
			}
		}
	}

	public void setOptions()
	{
		for (int i=0;i<nodeList.getLength() && i<5;i++)
		{
			Node first = nodeList.item(i);
			if (first.getNodeName().equals("header"))
			{
				XmlSimpleModel xsm = new XmlSimpleModel(first);
				this.autonumber = xsm.getBoolean("@autonumber");
				break;
			}
		}
	}

	private NodeWrapper createNodeWrapper(Node n, NodeWrapper afterThisOne)
	{
		NodeWrapper nw = new NodeWrapper(n, this);
		
		int idx = -1;
		if (afterThisOne != null)
		{
			idx = getNodeWrappers().indexOf(afterThisOne);
			if (idx == -1)
				idx = 0;
		
			getNodeWrappers().add(idx+1, nw);
		}
		else
			getNodeWrappers().add(nw);
		
		String id = ((Element)n).getAttribute("id");
		if (id==null)
		{
			id = Integer.toString( ++maxId );
			((Element)n).setAttribute("id", id);
		}
		int iid = Integer.valueOf(id);
		if (iid > maxId)
			maxId = iid;
		
		nodesById.put(id, nw);
		return nw;
	}

	public NodeWrapper add(NodeWrapper nw, String type)
	{
		Element newNode = getXml().createElement(type);
		Node after = nw.getNode().getNextSibling();
		nw.getNode().getParentNode().insertBefore(newNode, after);
		NodeWrapper newNw = createNodeWrapper(newNode, nw);
		newNw.setDeleteOnCancel(true);
		newNw.setupEditNode();
		
		getGuideView().insertNode(newNw, nw);
		newNw.getAddControls();
	
		return newNw;
	}

}
