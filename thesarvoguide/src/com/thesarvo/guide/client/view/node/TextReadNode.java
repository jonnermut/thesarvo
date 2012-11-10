package com.thesarvo.guide.client.view.node;

import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.HTMLPanel;
import com.google.gwt.user.client.ui.Panel;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.xphone.client.ui.widgets.Expando;
import com.thesarvo.xphone.client.ui.widgets.Tag;
import com.thesarvo.xphone.client.util.BrowserUtil;

public class TextReadNode extends ReadNode
{
//	@UiField
//	DivElement textDiv;
//	
//	interface MyUiBinder extends UiBinder<Widget, TextReadNode> {}
//	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	private boolean heading;
	private String clazz;
	private String tag;

	public TextReadNode()
	{
		
		//initWidget(uiBinder.createAndBindUi(this));
		
	}
	
	@Override
	public void init()
	{
		initWidget(new FlowPanel());
		super.init();
		

	}
	
	@Override
	public void updateAllWidgets()
	{
		clazz = (String) getModel().get("@class");
		tag = "div";
		heading = false;
		
		if (clazz!=null)
		{
			if (clazz.startsWith("heading"))
			{
				tag = "h" + clazz.substring(7);
				heading = true;
				
				if (Controller.get().isMobileApp())
					clazz += "mobile";
			}
		}
		else
			clazz = "text";
		
		Tag t = new Tag(tag, clazz);
		
		String text = getText();
		//Window.alert("text clazz=" + clazz + ", text=" + text);
		
		((Panel) getWidget()).clear();
		
		if (clazz.equals("indentedHeader") && text.indexOf(":") > -1)
		{
			int index = text.indexOf(":");
			
			String header = text.substring(0, index);
			text = text.substring(index+1).trim();
			

			HTMLPanel hp = new HTMLPanel("<table><tr class='" + Resources.INSTANCE.s().tstr() + "' ><td class='" + Resources.INSTANCE.s().tsleftcell() + "'><div class='" + Resources.INSTANCE.s().tssubhead() + "' >" + header + "</div></td><td><div class='" + Resources.INSTANCE.s().tssubcont() + "' >" + text + "</div></td></tr></table>" );
			((Panel) getWidget()).add(hp);
			
		}
		else
		{
			if (heading && BrowserUtil.isMobileBrowser())
			{
				//t.setHTML(text);
				
				//Window.alert("creating expando for:" + text);
				
				Expando expando = new Expando();
							
				t.setHTML(text);
				expando.getLabel().add(t);
				
				((GuideView)Controller.get().getCurrentView()).setCapturingPanel(expando.getContent());
								
				((Panel) getWidget()).add(expando);				
			}
			else
			{
				t.setHTML(text);	
				((Panel) getWidget()).add(t);
			}
		}
	}

	/**
	 * @return the heading
	 */
	public boolean isHeading()
	{
		return heading;
	}

	/**
	 * @param heading the heading to set
	 */
	public void setHeading(boolean heading)
	{
		this.heading = heading;
	}


}
