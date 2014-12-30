package com.thesarvo.guide.client.view.node;

import java.util.List;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.RunAsyncCallback;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.Style;
import com.google.gwt.dom.client.Style.Display;
import com.google.gwt.dom.client.Style.Position;
import com.google.gwt.dom.client.Style.TextAlign;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.http.client.Request;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.FlexTable;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.ImageNode;
import com.thesarvo.guide.client.phototopo.PhotoTopo;
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class ImageReadNode extends ReadNode
{
//	@UiField
//	Image img;
//	
//	@UiField
//	FlexTable legendTable;
//	
//	@UiField
//	DivElement legendDiv;
	
	//@UiField
	//FlowPanel imageTouchPanel;
	
	@UiField FlowPanel flowPanel;

	interface MyUiBinder extends UiBinder<Widget, ImageReadNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	boolean thumb = false;
	

	
	public ImageReadNode()
	{
		super();
		
		initWidget(uiBinder.createAndBindUi(this));
	}
	
	@Override
	public void init()
	{
				
		super.init();
		
		
		flowPanel.clear();
		
		
		final ImageNode imageNode = new ImageNode(getModel());
			
		boolean allowEdit = false;
		
		
		
		boolean mobileTopo = Controller.get().isMobileApp() && !Controller.get().isCallOut();
		
		//mobileTopo = true;
		
		if (mobileTopo)
		{
			//smallImage();
			thumb=true;
			
			Hyperlink link = new Hyperlink();
			
			final String url = imageNode.getUrl(true);
			
			Image image = new Image(url);
			image.getElement().getStyle().setDisplay(Display.BLOCK);
			image.getElement().getStyle().setTextAlign(TextAlign.CENTER);
			
			link.getElement().appendChild(image.getElement());
			link.setStyleName("imgBtnLink");
			link.getElement().getStyle().setBorderWidth(1, Unit.PX);
			
			String title = "Open Topo";
			if (imageNode.getLegend() && imageNode.getLegendTitle() != null && imageNode.getLegendTitle().length() > 0)
				title += " - " + imageNode.getLegendTitle();
			title += " ▶";
			
			link.setText(title);
			flowPanel.add(link);
			
			
			//Label l = new Label(url);
			//flowPanel.add(l);
			

			
			link.addClickHandler(new ClickHandler()
			{
				
				@Override
				public void onClick(ClickEvent event)
				{
					//Window.alert("URL:" + url);
					//Window.alert("hello!");
					//String xml = ;
					
					String imgXml = "<guide>" + getModel().getXml().toString();
					List<String> list = imageNode.getLegendValues();
					
					for (String id: list)
					{
						//String id = (String) sm.get(".");
						com.google.gwt.xml.client.Element e = null;
						
						if (id.indexOf(':') < 0)
							e = (com.google.gwt.xml.client.Element) Controller.get().getNode(id);
						
						if (e !=null)
						{
							imgXml += e.toString();
						}
					}
					final String xml = imgXml + "</guide>";
					
					
					//Window.alert("xml=" + xml);
					Controller.get().sendCommandToApp("openImage", xml);
				}
			});
			
			/*
			imageTouchPanel.getElement().getStyle().setPadding(5, Unit.PX);
			imageTouchPanel.getTouchManager().initTouchTracking();
			
			imageTouchPanel.getTouchManager().addClickHandler(new ClickHandler()
			{
				@Override
				public void onClick(ClickEvent event)
				{
					//int w = img.getWidth();
					if (thumb)
					{
						setImgSrc(false);
						setWidthAndLegend();
						//img.removeStyleName("buttonBorder");
					}
					else
					{
						smallImage();
					}
					thumb = !thumb;
				}
			});
			*/
		}
		else
		{
			createPhotoTopo(imageNode, flowPanel, allowEdit);
		}
	}

//	private void smallImage()
//	{
//		img.setWidth("auto");
//		setImgSrc(true);
//		img.addStyleName("buttonBorder");
//		legendTable.setVisible(false);
//	}

	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();
		
		for (int i =0;i<flowPanel.getWidgetCount();i++)
		{
			Widget w = flowPanel.getWidget(i);
			if (w instanceof Updateable)
				((Updateable) w).updateAllWidgets();
		}
			
//		if (!Controller.get().isMobileApp())
//		{
//			setWidthAndLegend();
//			setImgSrc(false);
//		}


	}

	public void setEditing(boolean editing)
	{
		
		super.setEditing(editing);
		
		flowPanel.clear();
		
		if (!editing)
		{
			
			ImageNode imageNode = new ImageNode(getModel());			
			ImageReadNode.createPhotoTopo(imageNode, flowPanel, false);
		}
	}
	
	public static void createPhotoTopo(final ImageNode imageNode, final FlowPanel flowPanel, final boolean allowEdit)
	{
		GWT.runAsync(new RunAsyncCallback()
		{
			
			@Override
			public void onSuccess()
			{
				PhotoTopo pt = new PhotoTopo(imageNode, 600, 400);
				
				flowPanel.add(pt);
					
				pt.getOptions().editable = allowEdit;
				pt.init();
				
				//parent.setPhototopo(pt);
				
			}
			
			@Override
			public void onFailure(Throwable reason)
			{
				Window.alert("Could not load photo topo code!");
				
			}
		});

	}



//	private void setImgSrc(boolean thumb)
//	{
//		String src = StringUtil.string(getModel().get("@src"));
//		String width = StringUtil.string(getModel().get("@width"));
//		img.setUrl( Controller.get().getAttachmentUrl(src, thumb, width) );
//	}
//
//	private void setWidthAndLegend()
//	{
//		if (getModel() == null)
//			return;
//		
//		String width = StringUtil.string(getModel().get("@width"));
//		
//
//		
//		if (StringUtil.isNotEmpty(width))
//		{
//			if (!width.endsWith("px"))
//				width += "px";
//			
//			img.setWidth(width);
//		}
//		else
//			img.setWidth("auto");
//
//		Boolean legend = StringUtil.bool(getModel().get("@legend"));
//		legendTable.setVisible(legend);
//		WidgetUtil.setVisible(legendDiv, legend);
//		
//		if (legend )
//		{
//			String x = StringUtil.string(getModel().get("@legendx"));
//			String y = StringUtil.string(getModel().get("@legendy"));
//			
//			String legendTitle = StringUtil.string(getModel().get("@legendTitle"));
//			
//			String legendFooter = StringUtil.string(getModel().get("@legendFooter"));
//			
//			String legendExtraPage = StringUtil.string(getModel().get("@legendExtraPage"));
//			boolean legendInsertExtraBefore = StringUtil.bool(getModel().get("@legendInsertExtraBefore"));
//			
//			if (x==null || x.trim().length()==0)
//				x = "0";
//			if (y==null || y.trim().length()==0)
//				y = "0";
//			
//			Style style = legendDiv.getStyle();
//			style.setPosition(Position.ABSOLUTE);
//			style.setTop(Double.valueOf(y), Unit.PX);
//			style.setLeft(Double.valueOf(x), Unit.PX);
//			
//			
//			final List<XmlSimpleModel> list = getModel().getList("legend");
//			//List<String> list= CollectionUtil.list(l);;
//			
//			int r=0;
//			legendTable.removeAllRows();
//			
//			if (StringUtil.isNotEmpty(legendTitle))
//			{
//				legendTable.setText(0, 0, legendTitle);
//				
//				
//				legendTable.getFlexCellFormatter().setColSpan(0, 0, 4);
//				
//				legendTable.getCellFormatter().setStyleName(0, 0, Resources.INSTANCE.s().legendTitle());
//				r++;
//			}	
//			
//			if (StringUtil.isNotEmpty(legendFooter))
//			{
//				int frow = r + list.size();
//				legendTable.setText(frow, 0, legendFooter);
//				
//
//				legendTable.getFlexCellFormatter().setColSpan(frow, 0, 4);
//				
//				legendTable.getCellFormatter().setStyleName(frow, 0, Resources.INSTANCE.s().legendFooter());
//				
//			}
//			
//			final LegendPopulator cmd = new LegendPopulator(list, r);
//			
//			if (StringUtil.isNotEmpty(legendExtraPage))
//			{
//				// make sure we have xml for extra page cached
//				
//				/*
//				 * FIXME - she broken 
//				 
//				Controller.get().getGuideXml(legendExtraPage, true, true, new XmlRequestCallback()
//				{
//					
//					@Override
//					public void onError(Request request, Throwable exception)
//					{
//						// ignore
//						cmd.execute();
//					}
//					
//					@Override
//					public void handleXml(Document xml)
//					{
//						cmd.setExtraXml(xml);
//						cmd.execute();
//					}
//				});
//				*/
//			}
//			else
//				cmd.execute();
//		}
//	}
//
//	protected void populateRow(int r, Element e)
//	{
//		legendTable.setText(r, 0, StringUtil.notNull(e.getAttribute("stars")));
//		legendTable.setText(r, 1, StringUtil.notNull(e.getAttribute("number")));
//		
//		String name = StringUtil.notNull( e.getAttribute("name") );
//		Label l = new Label(name);
//		l.setStyleName(Resources.INSTANCE.s().legendNameDiv());
//		
//		legendTable.setWidget(r, 2, l);
//		
//		String grade = StringUtil.notNull(e.getAttribute("grade"));
//		int idx = grade.indexOf("/"); 
//		if (idx > -1)
//			grade = grade.substring(0, idx);
//		
//		legendTable.setText(r, 3, grade);
//		
//		
//		legendTable.getCellFormatter().addStyleName(r, 0, Resources.INSTANCE.s().legendSmallCol());
//		legendTable.getCellFormatter().addStyleName(r, 1, Resources.INSTANCE.s().legendSmallCol());
//		legendTable.getCellFormatter().addStyleName(r, 2, Resources.INSTANCE.s().legendNameCol());
//		legendTable.getCellFormatter().addStyleName(r, 3, Resources.INSTANCE.s().legendSmallCol());
//	}		
//				
//		
//	private final class LegendPopulator implements Command
//	{
//		private final List<XmlSimpleModel> list;
//		int r;
//		private Document extraXml;
//		
//		private LegendPopulator(List<XmlSimpleModel> list, int row)
//		{
//			this.list = list;
//			r = row;
//		}
//
//		@Override
//		public void execute()
//		{
//			if (list!=null)
//			{
//				for (XmlSimpleModel sm: list)
//				{
//					String id = (String) sm.get(".");
//					Element e = null;
//					
//					if (id.indexOf(':') < 0)
//						e = (Element) Controller.get().getNode(id);
//					else
//					{
//						if (extraXml!=null)
//						{
//							if (extraXml.getDocumentElement()!=null)
//							{
//								id = id.substring(id.indexOf(':') + 1);
//								
//								NodeList nl = extraXml.getDocumentElement().getChildNodes();
//								for (int i=0;i<nl.getLength();i++)
//								{
//									Node n = nl.item(i);
//									if (n instanceof Element)
//									{
//										String nid = ((Element)n).getAttribute("id");
//										if (nid!=null && nid.equals(id))
//										{
//											e = (Element) n;
//										}
//									}
//								}
//							}
//							
//							
//						}
//					}
//					
//					if (e!=null)
//					{										
//						populateRow(r, e);	
//						r++;
//					}
//				}	
//			}
//		}
//
//		/**
//		 * @return the extraXml
//		 */
//		public Document getExtraXml()
//		{
//			return extraXml;
//		}
//
//		/**
//		 * @param extraXml the extraXml to set
//		 */
//		public void setExtraXml(Document extraXml)
//		{
//			this.extraXml = extraXml;
//		}
//	}


}
