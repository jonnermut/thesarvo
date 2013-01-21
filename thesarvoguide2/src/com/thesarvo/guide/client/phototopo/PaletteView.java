package com.thesarvo.guide.client.phototopo;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.dom.client.Style.Overflow;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ChangeEvent;
import com.google.gwt.event.dom.client.ChangeHandler;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.KeyUpEvent;
import com.google.gwt.event.dom.client.KeyUpHandler;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.event.logical.shared.ValueChangeHandler;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Frame;
import com.google.gwt.user.client.ui.Grid;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.StackPanel;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.ToggleButton;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.web.bindery.event.shared.EventBus;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.model.Attachment;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.res.Resources;

public class PaletteView extends VerticalPanel implements PhotoTopoEventHandler
{



	private static final int FIELDWIDTH = 105;
	
	com.google.web.bindery.event.shared.EventBus eventBus;
	PhotoTopo phototopo;
	
	Label status;

	List<ToggleButton> toolButtons = new ArrayList<ToggleButton>();
//	private ColorPickerItem fillColorPicker;
//	private ColorPickerItem strokeColorPicker;
//	private SpinnerItem strokeSizeSpinner;
//	private SpinnerItem cornerSizeSpinner;
//	private SliderItem opacitySlider;
//	private ComboBoxItem fontNameSelect;
//	private ComboBoxItem fontSizeSelect;
//	private TextAreaItem text;
	private VerticalPanel legendProperties;
	private VerticalPanel imageProperties;
//	private TextItem imageUrl;
	private VerticalPanel generalproperties;
	private StackPanel stackPanel;
	private Grid toolsGrid;
	int tool = 0;

	private List<CheckBox> legendCheckboxes;

	private List<String> legendIds;

	private ListBox attachmentListBox;
	
	public PaletteView(EventBus eventBus, PhotoTopo phototopo)
	{
		
		this.eventBus = eventBus;
		this.phototopo = phototopo;
		
		this.setWidth("176");
		
		
		

		toolsGrid = new Grid(2,4);
		toolsGrid.setCellPadding(0);
		toolsGrid.setCellSpacing(0);
		
		ToggleButton selectToolButton = addToolIcon(Resources.INSTANCE.selectTool(), "Select Tool", ToolType.select);
		
		//addToolIcon("straightlinetool.png", "Straight Line Tool", PathTool.class);
		addToolIcon(Resources.INSTANCE.curvedTool(), "Curved Line Tool", ToolType.curve);
		addToolIcon(Resources.INSTANCE.textTool(), "Text Tool", ToolType.text);
		
		addToolIcon(Resources.INSTANCE.rectTool(), "Rectangle Tool", ToolType.rect);
		
		//addToolIcon("circletool.png", "Circle Tool", CircleTool.class);
		//addToolIcon("ellipsetool.png", "Ellipse Tool", EllipseTool.class);		
		//addToolIcon("imagetool.png", "Image Tool", ImageTool.class);
		
		this.add(toolsGrid);

		status = new Label();
		status.setWidth("176px");
		status.setHeight("60px");	
		this.getElement().getStyle().setBackgroundColor("#eeeeff");
		this.add(status);
		
		stackPanel = new StackPanel();
		stackPanel.setHeight("500px");
		this.add(stackPanel);
		stackPanel.setWidth("176px");
		//stackPanel.setStylePrimaryName("cdstack");
		imageProperties = new VerticalPanel();
		legendProperties = new VerticalPanel();	
		generalproperties = new VerticalPanel();
		// stackPanel.add(new Label("blah"),"blah");
		stackPanel.add(imageProperties, "Image");
		stackPanel.add(legendProperties, "Legend");
		
		stackPanel.add(generalproperties, "Properties");
		// stackPanel.add(strokeFillProperties, "Properties");

		addProperties();
		
		selectTool(selectToolButton, ToolType.select);
		
		stackPanel.showStack(0);
	}
	
	public  void setLegendCheckboxValue(boolean checked, String id)
	{
		if (checked)
		{
			legendIds.clear();
			for (CheckBox c : legendCheckboxes)
			{
				if (c.getValue())
					legendIds.add(c.getName());
			}
		}
		else
			legendIds.remove(id);
		
		phototopo.getImage().setLegendValues(legendIds);
		phototopo.updateLegend();
	}

	/*
	private void setPropertyValues()
	{
		String fillColor = "";
		if (controller.getCurrentStyle().getFillColor()!=null)
			fillColor = controller.getCurrentStyle().getFillColor().toHex();
		
		fillColorPicker.setValue(fillColor);
		
		String strokeColor = "";
		if (controller.getCurrentStyle().getStrokeColor()!=null)
			strokeColor = controller.getCurrentStyle().getStrokeColor().toHex();
		strokeColorPicker.setValue(strokeColor);
		
		strokeSizeSpinner.setValue(controller.getCurrentStyle().getStrokeWidth());
		opacitySlider.setValue(controller.getCurrentStyle().getOpacity());

		fontNameSelect.setValue(controller.getCurrentFont().getFamily());
		fontSizeSelect.setValue(controller.getCurrentFont().getSize());

		if (controller.getSelectedObject() instanceof Rect)
		{
			cornerSizeSpinner.setValue( ((Rect)controller.getSelectedObject()).getCornerRadius() );
			cornerSizeSpinner.setDisabled(false);
		}
		else
		{
			cornerSizeSpinner.setDisabled(true);
		}
		
		String t = "";
		boolean isText = controller.getSelectedObject() instanceof Text; 
		if (isText)
		{
			t = ((Text) controller.getSelectedObject()).getText();
			showTextPropertiesStack();
			text.focusInItem();
		}
			
		text.setValue(t);
		displayFontProperties(isText);
		
		boolean isImage = controller.getSelectedObject() instanceof Image;
		if (isImage)
		{
			imageUrl.setValue( ((Image)controller.getSelectedObject()).getUrl() );
			showGeneralPropertiesStack();
		}
		imageUrl.setDisabled(!isImage);
	}*/

	public void showImagePropertiesStack()
	{
		stackPanel.showStack(0);
	}
	
	public void showLegendPropertiesStack()
	{
		stackPanel.showStack(1);
	}

	public void showGeneralPropertiesStack()
	{
		stackPanel.showStack(2);
	}

	private void addProperties()
	{
		addImageProperties();
		addLegendProperties();
	}

	private void addLegendProperties()
	{
		final CheckBox legend = new CheckBox("Show a Legend");
		legendProperties.add(legend);
		legend.setValue(phototopo.getImage().getLegend());
		legend.addValueChangeHandler(new ValueChangeHandler<Boolean>()
		{
			
			@Override
			public void onValueChange(ValueChangeEvent<Boolean> event)
			{
				phototopo.getImage().setLegend(legend.getValue());
				phototopo.updateLegend();
			}
		});
		
		Label l = new Label("Legend Title");
		l.setStyleName("paletteLabel");
		legendProperties.add(l);
		
		final TextBox ta = new TextBox();
		legendProperties.add(ta);
		ta.setText( phototopo.getImage().getLegendTitle() );
		ta.setStyleName("paletteTextbox");
		ta.addChangeHandler(new ChangeHandler()
		{			
			@Override
			public void onChange(ChangeEvent event)
			{
				phototopo.getImage().setLegendTitle(ta.getText());
				phototopo.updateLegend();
			}
		});
		ta.addKeyUpHandler(new KeyUpHandler()
		{
			
			@Override
			public void onKeyUp(KeyUpEvent event)
			{
				phototopo.getImage().setLegendTitle(ta.getText());
				phototopo.updateLegend();

				
			}
		});
		
		
		l = new Label("Legend Footer");
		l.setStyleName("paletteLabel");
		legendProperties.add(l);
		
		final TextBox tb = new TextBox();
		legendProperties.add(tb);
		tb.setText( phototopo.getImage().getLegendFooter() );
		tb.setStyleName("paletteTextbox");
		tb.addChangeHandler(new ChangeHandler()
		{			
			@Override
			public void onChange(ChangeEvent event)
			{
				phototopo.getImage().setLegendFooter(tb.getText());
				phototopo.updateLegend();
				

			}
		});
		tb.addKeyUpHandler(new KeyUpHandler()
		{
			
			@Override
			public void onKeyUp(KeyUpEvent event)
			{
				phototopo.getImage().setLegendFooter(tb.getText());
				phototopo.updateLegend();

				
			}
		});
		
		l = new Label("Select climbs in legend");
		l.setStyleName("paletteLabel");
		legendProperties.add(l);
		
		FlowPanel fp = new FlowPanel();
		legendProperties.add(fp);
		fp.setWidth("170px");
		fp.setHeight("250px");
		fp.getElement().getStyle().setOverflow(Overflow.AUTO);
		fp.getElement().getStyle().setBorderColor("silver");
		fp.getElement().getStyle().setBorderWidth(1, Unit.PX);
		
		legendCheckboxes = new ArrayList<CheckBox>();
		legendIds = phototopo.getImage().getLegendValues();
		int i=0;
		for (String[] val : Controller.get().getClimbStrings() )
		{
			i++;
			final String id = val[1];
			final CheckBox cb = new CheckBox(val[0]);
			cb.setName(id);
			legendCheckboxes.add(cb);
			FlowPanel fp2 = new FlowPanel();
			fp2.add(cb);
			fp.add(fp2);
			if (i%2 == 1)
				fp2.getElement().getStyle().setBackgroundColor("#eeeeee");
			
			cb.setStyleName("paletteInput");
			cb.setTitle(val[0]);
			cb.setValue(legendIds.contains(id));
			cb.addValueChangeHandler(new LegendCheckboxValueChangeHandler(cb, id));
		}
		
	}

	private void addImageProperties()
	{
		
		Label l = new Label("Image");
		l.setStyleName("paletteLabel");
		imageProperties.add(l);
		
		attachmentListBox = new ListBox();
		attachmentListBox.setStyleName("paletteListbox");
		imageProperties.add(attachmentListBox);
		
		
		//for (Attachment att: phototopo.getAttachments())
		//	lb.addItem(att.getName(), att.getSrc());
		
		populateAttachments(false);

		
		attachmentListBox.addChangeHandler(new ChangeHandler()
		{
			
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = attachmentListBox.getValue( attachmentListBox.getSelectedIndex() );
				if (val != null && val.length() > 0)
					phototopo.setNewImageSrc(val);
				
			}
		});
		
		Anchor uploadAnchor = new Anchor("Upload an image");
		imageProperties.add(uploadAnchor);
		//uploadAnchor.setHref("../../pages/viewpageattachments.action?pageId=" + Controller.get().getGuideId() + "#attachFile");
		//Window.op
		uploadAnchor.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				final UploadPopup up = new UploadPopup(PaletteView.this);
				
				//up.show();
				up.setPopupPositionAndShow(new PopupPanel.PositionCallback() 
				{
			          public void setPosition(int offsetWidth, int offsetHeight) 
			          {
			            int left = (Window.getClientWidth() - offsetWidth) / 3;
			            int top = Window.getScrollTop() + (Window.getClientHeight() - offsetHeight) / 3;
			            up.setPopupPosition(left, top);
			          }
				});
			}
		});
		
		
		l = new Label("Width");
		l.setStyleName("paletteLabel");
		imageProperties.add(l);

		
		final ListBox widthListBox = new ListBox();
		widthListBox.setStyleName("paletteListbox");
		imageProperties.add(widthListBox);
		widthListBox.addItem("auto","");
		widthListBox.addItem("100");
		widthListBox.addItem("200");
		widthListBox.addItem("300");
		widthListBox.addItem("400");
		widthListBox.addItem("500");
		widthListBox.addItem("600");
		widthListBox.addItem("700");
		widthListBox.addItem("800");
		widthListBox.addItem("900");
		widthListBox.addItem("1000");
		setSelected(widthListBox, phototopo.getImage().getWidth());
		widthListBox.addChangeHandler(new ChangeHandler()
		{
			
			@Override
			public void onChange(ChangeEvent event)
			{
				
				String val = widthListBox.getValue( widthListBox.getSelectedIndex() );
				phototopo.setImageWidth(val);
				
				
				
			}
		});
		
		imageProperties.add(new Label("."));
		
		final CheckBox notInPrint = new CheckBox("Not in print version");
		imageProperties.add(notInPrint);
		notInPrint.setValue(phototopo.getImage().getNoPrint());
		notInPrint.addValueChangeHandler(new ValueChangeHandler<Boolean>()
		{
			
			@Override
			public void onValueChange(ValueChangeEvent<Boolean> event)
			{
				phototopo.getImage().setNoPrint(notInPrint.getValue());
				
			}
		});
	}

	public void populateAttachments(boolean selectNew)
	{
		Controller.get().populateAttachments(attachmentListBox, phototopo.getImage().getSrc(), selectNew);
	}

	private void addGeneralProperties()
	{
		

		
	}





//	private void addTool(final String l, final Class<?> toolClass)
//	{
//		final ToggleButton tb = new ToggleButton(l);
//
//		addToolClickHandler(toolClass, tb);
//
//		this.add(tb);
//		toolButtons.add(tb);
//	}
	
	private ToggleButton addToolIcon(ImageResource resource, final String tooltip, final ToolType type)
	{
		final ToggleButton tb = new ToggleButton(new Image(resource));
		//tb.setHTML("<img src='" + filename + "' />");
		//tb.setTitle(tooltip);
		tb.setWidth("32px");

		addToolClickHandler(type, tb);

		//this.add(tb);
		toolsGrid.setWidget(tool/4, tool%4,  tb);
		toolButtons.add(tb);
		
		tool ++ ;
		
		return tb;
	}

	private void addToolClickHandler(final ToolType toolClass, final ToggleButton tb)
	{
		tb.addClickHandler(new com.google.gwt.event.dom.client.ClickHandler()
		{
			public void onClick(com.google.gwt.event.dom.client.ClickEvent event)
			{
				selectTool(tb, toolClass);

			}
		});
	}
	
	
	

	protected void setStatus(String text)
	{
		status.setText(text);
	}

	private void setToolButtonSelected(ToolType type)
	{
		for (ToggleButton tb2 : toolButtons)
		{
			tb2.setDown(false);
			if (tb2.getTitle().toLowerCase().contains(type.name()))
				tb2.setDown(true);
		}
	}
	
	private void selectTool(final ToggleButton tb, final ToolType toolClass)
	{
		//controller.toolSelected(l);
		//getEventManager().fireEvent(new ToolSelectedEvent(toolClass) );
		
		for (ToggleButton tb2 : toolButtons)
		{
			if (tb2.isDown() && tb2 != tb)
				tb2.setDown(false);
		}
		phototopo.setSelectedTool(toolClass);

	}

	protected void selectedObjectChanged()
	{
		setPropertyValues();
	}

//	@Override
//	public void onCrossDrawEvent(CrossDrawEvent event)
//	{
//		if (event instanceof SelectedObjectChangedEvent)
//			selectedObjectChanged();
//		else if (event instanceof StatusChangedEvent)
//			setStatus((String) event.getSubject());
//
//	}

	private void setPropertyValues()
	{
		// TODO Auto-generated method stub
		
	}

	public EventBus getEventManager()
	{
		return eventBus;
	}

	public void setEventManager(EventBus eventBus)
	{
		this.eventBus = eventBus;
	}

	@Override
	public void onEvent(PhotoTopoEvent event)
	{
		// TODO Auto-generated method stub
		
	}

	public void setSelectedPoint(final RoutePoint selectedPoint)
	{
		setToolButtonSelected(ToolType.curve);
		
		generalproperties.clear();

		addGenPropsLabel("Point").setStyleName("paletteLabelSubheading");
		addGenPropsLabel("Icon");
		
		
		final ListBox lb = new ListBox();
		lb.setStyleName("paletteListbox");
		generalproperties.add(lb);
		lb.addItem("none", "");
		lb.addItem("belay", "belay");
		lb.addItem("lower off", "lower");
		lb.addItem("lower off (left)", "lower-left");
		lb.addItem("lower off (right)", "lower-right");
		lb.addItem("label", "label");
		
		String val = selectedPoint.getType();
		setSelected(lb, val);
		lb.addChangeHandler(new ChangeHandler()
		{
			
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = lb.getValue( lb.getSelectedIndex() );
				selectedPoint.setType(val);
				selectedPoint.route.saveData();
				
				if ("label".equals(val))
					selectedPoint.route.updateLabel();

			}
		});
		
		Button removeButton = new Button("Remove Point");
		removeButton.setStyleName("paletteButton");
		generalproperties.add(removeButton);
		removeButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				if (Window.confirm("Are you sure you want to delete this point?\nYou can't undo this."))
					selectedPoint.remove();
				
			}
		});
		
		addRouteProperties(selectedPoint.route);
		
		showGeneralPropertiesStack();
		
	}

	private void setSelected(final ListBox lb, String val)
	{
		if (val==null)
			val = "";
		val = val.trim();
		
		for (int i=0;i<lb.getItemCount();i++)
		{
			if (lb.getValue(i).equals(val))
			{
				lb.setSelectedIndex(i);
				break;
			}
		}

	}

	public Label addGenPropsLabel(String txt)
	{
		Label l = new Label(txt);
		l.setStyleName("paletteLabel");
		generalproperties.add(l);
		return l;
	}

	public void setSelectedRoute(final Route route)
	{
		setToolButtonSelected(ToolType.curve);
		
		generalproperties.clear();
		
		addRouteProperties(route);
	}

	public void addRouteProperties(final Route route)
	{
		addGenPropsLabel("Route Line").setStyleName("paletteLabelSubheading");
		
		addGenPropsLabel("Linked To");
		final ListBox lb = new ListBox();
		lb.setStyleName("paletteListbox");
		generalproperties.add(lb);
		
		addGenPropsLabel("Label");
		final TextBox labelBox = new TextBox();
		labelBox.setStyleName("paletteTextbox");
		generalproperties.add(labelBox);

		addGenPropsLabel("Line Style");
		final ListBox lbStyle = new ListBox();
		lbStyle.setStyleName("paletteListbox");
		generalproperties.add(lbStyle);
		
//		lb.addItem("<select>", "");
//		lb.addItem("Some route", "1");
//		lb.addItem("Some other route", "2");
		lb.addItem("<select>", "");
		Controller.get().populateClimbs(lb, "", false,  route.getData().getLinkedTo());
		
		lbStyle.addItem("Solid", "solid");
		lbStyle.addItem("Dashed", "dashed");
		lbStyle.addItem("Dotted", "dotted");
		
		setSelected(lbStyle, route.getData().getLineStyle());
		
		lb.addChangeHandler(new ChangeHandler()
		{		
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = lb.getValue(lb.getSelectedIndex());
				route.getData().setLinkedTo(val);
				labelBox.setValue(route.getData().getLabelText());
				route.updateLabel();
				
				
				if (legendCheckboxes != null)
				{
					for (CheckBox cb : legendCheckboxes)
					{
						if (cb.getName() != null && cb.getName().equals(val))
						{
							cb.setValue(true);
							setLegendCheckboxValue(true, val);
						}
					}
				}
			}
		});

		lbStyle.addChangeHandler(new ChangeHandler()
		{
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = lbStyle.getValue(lbStyle.getSelectedIndex());
				route.getData().setLineStyle(val);

				// redraw the (selected) route with the new line
				route.deselect();
				phototopo.selectRoute(route.getId(), false);
			}
		});

		labelBox.setValue(route.getData().getLabelText());
		labelBox.addValueChangeHandler(new ValueChangeHandler<String>()
		{

			@Override
			public void onValueChange(ValueChangeEvent<String> event)
			{
				route.getData().setLabelText(labelBox.getValue());
				route.updateLabel();
				
			}
		});
		labelBox.addKeyUpHandler(new KeyUpHandler()
		{
			
			@Override
			public void onKeyUp(KeyUpEvent event)
			{
				route.getData().setLabelText(labelBox.getValue());
				route.updateLabel();
				
			}
		});
		
		
		
		Button removeButton = new Button("Remove Line");
		removeButton.setStyleName("paletteButton");
		generalproperties.add(removeButton);
		removeButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				if (Window.confirm("Are you sure you want to delete this route?\nYou can't undo this."))
					route.remove();
				
			}
		});
	}

	public void setSelectedRect(final RectWithText text)
	{
		generalproperties.clear();
		showGeneralPropertiesStack();
		
		addGenPropsLabel("Text");		
		final TextArea ta = new TextArea();
		generalproperties.add(ta);
		ta.setText( text.getText() );
		ta.setStyleName("paletteTextarea");
		ta.addChangeHandler(new ChangeHandler()
		{			
			@Override
			public void onChange(ChangeEvent event)
			{
				text.setText(ta.getText());
			}
		});
		ta.addKeyUpHandler(new KeyUpHandler()
		{
			
			@Override
			public void onKeyUp(KeyUpEvent event)
			{
				text.setText(ta.getText());	
				
			}
		});

		addGenPropsLabel("Style");
		final ListBox lb = new ListBox();
		generalproperties.add(lb);
		lb.setStyleName("paletteListbox");
		for (RectStyle s : RectStyle.values())
		{
			lb.addItem(s.name().replace('_', ' '), s.name());
		}
		
		String val = text.getStyle().name();
		setSelected(lb, val);
		lb.addChangeHandler(new ChangeHandler()
		{
			
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = lb.getValue( lb.getSelectedIndex() );
				text.setStyle(RectStyle.valueOf(val));
			}
		});
		
		addGenPropsLabel("Arrow");
		final ListBox alb = new ListBox();
		generalproperties.add(alb);
		alb.setStyleName("paletteListbox");
		for (ArrowDirection s : ArrowDirection.values())
		{
			alb.addItem(s.name().replace('_', ' '), s.name());
		}
		
		val = text.getArrowDirection().name();
		setSelected(alb, val);
		alb.addChangeHandler(new ChangeHandler()
		{
			
			@Override
			public void onChange(ChangeEvent event)
			{
				String val = alb.getValue( alb.getSelectedIndex() );
				text.setArrowDirection(ArrowDirection.valueOf(val));
			}
		});
		
		Button removeButton = new Button("Remove");
		generalproperties.add(removeButton);
		removeButton.setStyleName("paletteButton");
		removeButton.addClickHandler(new ClickHandler()
		{
			
			@Override
			public void onClick(ClickEvent event)
			{
				if (Window.confirm("Are you sure you want to delete this?\nYou can't undo this."))
				{
					text.remove();
					generalproperties.clear();
				}
			}
		});
	}


	private final class LegendCheckboxValueChangeHandler implements ValueChangeHandler<Boolean>
	{
		private final CheckBox cb;
		private final String id;
		
		private LegendCheckboxValueChangeHandler(CheckBox cb, String id)
		{
			this.cb = cb;
			this.id = id;
		}
	
		@Override
		public void onValueChange(ValueChangeEvent<Boolean> event)
		{
			setLegendCheckboxValue(cb.getValue(), id);
		}
	
	
	}


	public void uploadPopupClosed()
	{
		if (attachmentListBox != null)
		{
			attachmentListBox.clear();
			Controller.get().getCurrentGuide().setAttachments(null);
			populateAttachments(true);
		}
		
	}
	

//	private void setText()
//	{
//		if (controller.getSelectedObject() instanceof Text)
//		{
//			Text t = (Text) controller.getSelectedObject();
//			String newVal = text.getValue().toString();	
//			if (newVal!=null && !newVal.equals(t.getText()))
//				t.setText(newVal);
//		}
//	}

}
