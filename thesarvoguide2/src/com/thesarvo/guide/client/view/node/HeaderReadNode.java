package com.thesarvo.guide.client.view.node;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.TableRowElement;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.NodeList;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.Guide;
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.res.Resources;

public class HeaderReadNode extends ReadNode
{
	@UiField TableRowElement walkTR;
	@UiField TableRowElement sunTR;
	@UiField TableRowElement rockTR;
	@UiField TableRowElement acknowledgementTR;
	@UiField TableRowElement introductionTR;
	@UiField TableRowElement historyTR;
	@UiField TableRowElement accessTR;
	@UiField TableRowElement campingTR;
	
	@UiField Image imageGraph;
	
	@UiField Element heading;
	
	@UiField BoundLabel name;
	@UiField BoundMultlineLabel walk;
	@UiField BoundMultlineLabel sun;
	@UiField BoundMultlineLabel rock;
	@UiField BoundMultlineLabel acknowledgement;
	@UiField BoundMultlineLabel intro;
	@UiField BoundMultlineLabel history;
	@UiField BoundMultlineLabel access;
	@UiField BoundMultlineLabel camping;
	
	
	
	interface MyUiBinder extends UiBinder<Widget, HeaderReadNode> {}
	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public HeaderReadNode()
	{
		super();
	}

	
	@Override
	public void init()
	{

		
		Widget ui = uiBinder.createAndBindUi(this);


		
		if (!Controller.get().isMobileApp())
			initWidget(ui);	
		else
		{
			String h = null;
			String hc = null;
			
			if (Controller.get().getCurrentGuide()!=null)
			{
				NodeList nl = Controller.get().getCurrentGuide().getNodeList();
				for (int i=0;i<nl.getLength();i++)
				{
					Node n = nl.item(i);
					if (n instanceof com.google.gwt.xml.client.Element)
					{
						String clazz = ((com.google.gwt.xml.client.Element)n).getAttribute("class");
						if (clazz != null && clazz.equals("heading3"))
						{
							h = "h3";
							hc = "heading3mobile";
						}
						else if (clazz != null && clazz.equals("heading2"))
						{
							h = "h2";
							hc = "heading2mobile";
							break;
						}
					}
				}
			}
			
			/*
			if (h!=null)
			{
				//Window.alert("creating expando for header");
				
				Expando expando = new Expando();
				Tag t = new Tag(h, hc);
				t.setText("Introduction");
				expando.getLabel().add(t);
				expando.getContent().add(ui);
				initWidget(expando);	
				((GuideView)Controller.get().getCurrentView()).setCapturingPanel(expando.getContent());
			}
			else
			*/
			initWidget(ui);
		}
		
		boundWidgets = new Widget[] {
				name, walk,sun,rock,acknowledgement,intro,history,access,camping
		};
		super.init();
		
		if (!BrowserUtil.isMobileBrowser())
		{
			String graphUrl = Controller.get().getGraphUrl();
			imageGraph.setUrl( graphUrl );
		}
		else
		{
			imageGraph.setVisible(false);
		}
	}

	@Override
	public void updateAllWidgets()
	{
		super.updateAllWidgets();
		
		
		
		
		WidgetUtil.setVisible(walkTR, isWalk());
		
		WidgetUtil.setVisible(sunTR, isSun());

		WidgetUtil.setVisible(rockTR, isRock());
		
		WidgetUtil.setVisible(introductionTR, isIntroduction());
		
		WidgetUtil.setVisible(acknowledgementTR, isAcknowledgement());

		WidgetUtil.setVisible(historyTR, isHistory());
		
		WidgetUtil.setVisible(accessTR, isAccess());

		WidgetUtil.setVisible(campingTR, isCamping());
		
		
		/*
		if (Controller.get().isMultiPage())
		{
			String title = StringUtil.string(getModel().get("@name"));
			
			Guide guide = Controller.get().getCurrentGuide();
			if (guide!=null)
			{
				guide.getGuideView().setTitle(title);
				WidgetUtil.setVisible(heading, false);
			}
			
		}
		*/

	}
	
	public boolean isWalk()
	{
		return StringUtil.bool(getModel().get("@walk"));
	}
	
	public boolean isSun()
	{
		return StringUtil.bool(getModel().get("@sun"));
	}
	
	public boolean isRock()
	{
		return StringUtil.bool(getModel().get("@rock"));
	}
	
	public boolean isAcknowledgement()
	{
		return StringUtil.bool(getModel().get("@acknowledgement"));
	}
	
	public boolean isIntroduction()
	{
		return StringUtil.bool(getModel().get("@intro"));
	}
	
	public boolean isHistory()
	{
		return StringUtil.bool(getModel().get("@history"));
	}
	
	public boolean isAccess()
	{
		return StringUtil.bool(getModel().get("@access"));
	}

	public boolean isCamping()
	{
		return StringUtil.bool(getModel().get("@camping"));
	}
	
	public static String getImageSize()
	{
		if (BrowserUtil.isMobileBrowser())
			return "32px";
		else
			return "64px";
	}
	
	public static ImageResource rock()
	{
		if (BrowserUtil.isMobileBrowser())
			return Resources.INSTANCE.rockSmall();
		else
			return Resources.INSTANCE.rock();
	}
	
	public static ImageResource walk()
	{
		if (BrowserUtil.isMobileBrowser())
			return Resources.INSTANCE.walkSmall();
		else
			return Resources.INSTANCE.walk();
	}	

	public static ImageResource sun()
	{
		if (BrowserUtil.isMobileBrowser())
			return Resources.INSTANCE.sunSmall();
		else
			return Resources.INSTANCE.sun();
	}
}
