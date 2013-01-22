package com.thesarvo.guide.client.phototopo;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gwt.dom.client.Style;
import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.FocusPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.ImageNode;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.view.res.Resources;

public class Legend extends FocusPanel
{
	PhotoTopo phototopo;
	
	LegendTable legendTable;

	Map<String, Integer> idToRow = new HashMap<String, Integer>();
	Map<Integer, String> rowToId = new HashMap<Integer, String>();
	
	int hightlightRow = -1;

	public Legend(PhotoTopo phototopo)
	{
		this.phototopo = phototopo;
	}
	
	public void init()
	{
		this.setStyleName(Resources.INSTANCE.s().legendDiv());
		FlowPanel innerDiv = new FlowPanel();
		innerDiv.getElement().getStyle().setPosition(Position.RELATIVE);
		this.add(innerDiv);
		legendTable = new LegendTable();
		legendTable.legend = this;
		legendTable.setStyleName(Resources.INSTANCE.s().legendTable());
		innerDiv.add(legendTable);
		this.getElement().getStyle().setZIndex(2);
		innerDiv.getElement().getStyle().setZIndex(2);
		
		ImageNode imageNode= phototopo.getImage();
		
		Integer x = imageNode.getLegendX();
		Integer y = imageNode.getLegendY();
		
		if (x==null)
			x=0;
		if (y==null)
			y=0;
		
		String legendTitle = imageNode.getLegendTitle();
		
		String legendFooter = imageNode.getLegendFooter();
		
		//String legendExtraPage = StringUtil.string(getModel().get("@legendExtraPage"));
		//boolean legendInsertExtraBefore = StringUtil.bool(getModel().get("@legendInsertExtraBefore"));
		
		//if (x==null || x.trim().length()==0)
		//	x = "0";
		//if (y==null || y.trim().length()==0)
		//	y = "0";
		
		Style style = this.getElement().getStyle();
		style.setPosition(Position.ABSOLUTE);
		style.setTop(y, Unit.PX);
		style.setLeft(x, Unit.PX);
		
		
		//final List<XmlSimpleModel> list = getModel().getList("legend");
		//List<String> list= CollectionUtil.list(l);;
		
		int r=0;
		legendTable.removeAllRows();
		
		List<String> legendIds = imageNode.getLegendValues();
		
		if (StringUtil.isNotEmpty(legendTitle))
		{
			legendTable.setText(0, 0, legendTitle);
			
			
			legendTable.getFlexCellFormatter().setColSpan(0, 0, 4);
			
			legendTable.getCellFormatter().setStyleName(0, 0, Resources.INSTANCE.s().legendTitle());
			r++;
		}	
		
		if (StringUtil.isNotEmpty(legendFooter))
		{
			int frow = r + legendIds.size();
			//int frow = 2;
			legendTable.setText(frow, 0, legendFooter);
			

			legendTable.getFlexCellFormatter().setColSpan(frow, 0, 4);
			
			legendTable.getCellFormatter().setStyleName(frow, 0, Resources.INSTANCE.s().legendFooter());
			
		}

		legendTable.addClickHandler(new ClickHandler()
		{
			@Override
			public void onClick(ClickEvent event)
			{
				com.google.gwt.user.client.ui.HTMLTable.Cell cell = legendTable.getCellForEvent(event);
				if (cell != null)
				{
					if (!phototopo.isEditable())
					{
						int row = cell.getRowIndex();
						String id = rowToId.get(row);
						if (StringUtil.isNotEmpty(id))
						{
							
							clearHighlight();
							highlightId(id);
							
							phototopo.selectClimbId(id);
							
							RoutePopover rp = new RoutePopover(id, phototopo);
							rp.showRelativeTo(legendTable);
						}
					}
				}
			}
		});
		
		final LegendPopulator cmd = new LegendPopulator(legendIds, r);
		
		cmd.execute();
	}


	public void onMouseOver(Element tr)
	{
		if (tr != null)
		{
			if (!phototopo.isEditable())
			{
				if (phototopo.isRoutePopoverIsVisible())
				{
					// don't change lines
					Console.log("Legend onMouseOver phototopo.RoutePopoverVisible");
					Console.log(String.valueOf(phototopo.isRoutePopoverIsVisible()));
				}
				else
				{
					Element tbody = DOM.getParent(tr);
					int row = DOM.getChildIndex(tbody, tr);
					String id = rowToId.get(row);

					if (StringUtil.isNotEmpty(id))
					{
						clearHighlight();
						highlightId(id);
						phototopo.selectClimbId(id);
					}
				}
			}
		}
	}


	public void onMouseOut(Element tr)
	{
		if (phototopo.isRoutePopoverIsVisible())
		{
			// don't change lines
			Console.log("Legend onMouseOut phototopo.RoutePopoverVisible");
			Console.log(String.valueOf(phototopo.isRoutePopoverIsVisible()));
		}
		else
		{
			clearHighlight();
			phototopo.deselectAll();
		}
	}

	
	public void highlightId(String id)
	{
		clearHighlight();
		
		if (StringUtil.isNotEmpty(id))
		{
			Integer row = idToRow.get(id);
			if (row != null)
			{
				legendTable.getRowFormatter().addStyleName(row, "legendHighlight");
				hightlightRow = row;
			}
		}
	}
	
	public void clearHighlight()
	{
		if (hightlightRow != -1)
		{
			legendTable.getRowFormatter().removeStyleName(hightlightRow, "legendHighlight");
			hightlightRow = -1;
		}
		
	}
	
	
	// FIXME - do this via a model obj
	protected void populateRow(int r, com.google.gwt.xml.client.Element e)
	{
		String stars = StringUtil.notNull(e.getAttribute("stars"));
				
		stars = stars.replace('*', (char) 9733).trim();
		
		legendTable.setText(r, 0, stars );
		legendTable.setText(r, 1, StringUtil.notNull(e.getAttribute("number")));
		
		String name = StringUtil.notNull( e.getAttribute("name") );
		Label l = new Label(name);
		l.setStyleName(Resources.INSTANCE.s().legendNameDiv());
		
		legendTable.setWidget(r, 2, l);
		
		String grade = StringUtil.notNull(e.getAttribute("grade"));
		int idx = grade.indexOf("/"); 
		if (idx > -1)
			grade = grade.substring(0, idx);
		
		legendTable.setText(r, 3, grade);
		
		String id = StringUtil.notNull(e.getAttribute("id"));
		if (StringUtil.isNotEmpty(id))
		{
			idToRow.put(id, r);
			rowToId.put(r, id);
		}
		
		
		legendTable.getCellFormatter().addStyleName(r, 0, Resources.INSTANCE.s().legendSmallCol());
		legendTable.getCellFormatter().addStyleName(r, 1, Resources.INSTANCE.s().legendSmallCol());
		legendTable.getCellFormatter().addStyleName(r, 2, Resources.INSTANCE.s().legendNameCol());
		legendTable.getCellFormatter().addStyleName(r, 3, Resources.INSTANCE.s().legendSmallCol());
		
		
	}		
				
	
	// FIXME - do this via a model obj
	private final class LegendPopulator implements Command
	{
		private final List<String> list;
		int r;
		private Document extraXml;
		
		private LegendPopulator(List<String> legendIds, int row)
		{
			this.list = legendIds;
			r = row;
		}

		@Override
		public void execute()
		{
			if (list!=null)
			{
				for (String id: list)
				{
					//String id = (String) sm.get(".");
					com.google.gwt.xml.client.Element e = null;
					
					if (id.indexOf(':') < 0)
						e = (com.google.gwt.xml.client.Element) Controller.get().getNode(id);
					else
					{
						if (extraXml!=null)
						{
							if (extraXml.getDocumentElement()!=null)
							{
								id = id.substring(id.indexOf(':') + 1);
								
								NodeList nl = extraXml.getDocumentElement().getChildNodes();
								for (int i=0;i<nl.getLength();i++)
								{
									Node n = nl.item(i);
									if (n instanceof com.google.gwt.xml.client.Element)
									{
										String nid = ((com.google.gwt.xml.client.Element)n).getAttribute("id");
										if (nid!=null && nid.equals(id))
										{
											e = (com.google.gwt.xml.client.Element) n;
										}
									}
								}
							}
							
							
						}
					}
					
					if (e!=null)
					{										
						populateRow(r, e);	
						r++;
					}
				}	
			}
		}
	}
}
