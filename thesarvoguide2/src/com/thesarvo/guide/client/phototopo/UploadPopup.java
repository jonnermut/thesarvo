package com.thesarvo.guide.client.phototopo;

import com.google.gwt.dom.client.BodyElement;
import com.google.gwt.dom.client.Document;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.FrameElement;
import com.google.gwt.dom.client.Node;
import com.google.gwt.dom.client.Style.Display;
import com.google.gwt.dom.client.Style.Overflow;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.LoadEvent;
import com.google.gwt.event.dom.client.LoadHandler;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Frame;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.thesarvo.guide.client.controller.Controller;

public class UploadPopup extends PopupPanel
{
	PaletteView palette;
	boolean loadedOnce = false;
	
	public UploadPopup(PaletteView pv)
	{
		super(false, false);
		
		this.palette = pv;
		
		this.getElement().getStyle().setZIndex(100);
		
		setGlassEnabled(true);
		VerticalPanel vp = new VerticalPanel();
		
		int h = (Window.getClientHeight() * 5) / 6;
		int w = (Window.getClientWidth() * 5) / 6;
		
		setWidth("" + w + "px");
		setHeight("" + h + "px");
		
		vp.setWidth("" + w + "px");
		vp.setHeight("" +  h+ "px");
		add(vp);
		final Frame frame = new Frame("../../pages/viewpageattachments.action?pageId=" + Controller.get().getGuideId() + "#attachFile");
		frame.setHeight("" + (h - 20) + "px");
		frame.setWidth("" + (w - 10) + "px");
		
		
		frame.addLoadHandler(new LoadHandler()
		{
			
			@Override
			public void onLoad(LoadEvent event)
			{
				Console.log("frame onload");
				FrameElement fe = frame.getElement().cast();
				if (fe != null)
				{
					fe.setScrolling("yes");
					
					
					
					Document doc = fe.getContentDocument();
					if (doc != null)
					{
						if (loadedOnce)
							palette.uploadPopupClosed();
						
						loadedOnce = true;
						
						Console.log("found document");
						
						BodyElement be = doc.getBody();
						Element content = doc.getElementById("viewAttachmentsDiv");
						//Element content = doc.getElementById("upload-div");
						//Element content2 = doc.getElementById("viewAttachmentsDiv");
						
						Console.log("body="+ be + ",content=" + content);
						
						if (be != null && content != null)
						{
							for (int n = 0;n<be.getChildCount();n++)
							{
								Node node = be.getChild(n);
								Console.log("Found node:"+ node + " name:" + node.getNodeName());
								if (node instanceof Element && node.getNodeName().equals("div"))
								{
									Console.log("Setting body child to not display");
									((Element)node).getStyle().setDisplay(Display.NONE);
								}
							}
							Console.log("appending content element to body");
							be.appendChild(content);
							content.getStyle().setDisplay(Display.BLOCK);
							content.getStyle().setOverflow(Overflow.AUTO);
							be.getStyle().setOverflow(Overflow.AUTO);
							
							Element va = doc.getElementById("view-attachments");
							if (va != null)
							{
								va.getParentElement().appendChild(va);
							}
							
							Element full = doc.getElementById("full-height-container");
							if (full != null)
							{
								Console.log("found full:" + full);
								full.getStyle().setDisplay(Display.NONE);
							}
							
						}
					}
				}
				
				
			}
		});
		
		vp.add(frame);
		
		
		Button closeButton = new Button("Close");
		closeButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				hide();
				
			}
		});
		vp.add(closeButton);
		
	}
}
