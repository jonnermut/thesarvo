package com.thesarvo.guide.client.view.node;


import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.util.StringEscapeUtils;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.view.res.GuideStyle;
import com.thesarvo.guide.client.view.res.Resources;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;


public class ClimbReadNode extends ReadNode
{
	
	private static final String COLSPAN5 = "colspan='5'";
	//private static final String SPAN = "span";
	private static final String TD = "td";
	//private static final String STAR1 = new String( Character.toChars(9733) );
	//private static final String STAR2 = STAR1 + STAR1;
	//private static final String STAR3 = STAR2 + STAR1;

	//@UiField
	//Image starsImage;
	
//	@UiField
//	InlineLabel starsLabel;
//	
//	@UiField
//	BoundInlineLabel nameLabel;
//	
//	@UiField
//	BoundInlineLabel lengthLabel;
//
//	@UiField
//	BoundInlineLabel numLabel;
//
//	@UiField
//	BoundInlineLabel gradeLabel;
//
//	@UiField
//	BoundInlineLabel extraLabel;
//	
//	@UiField
//	Label textLabel;
	
	
//	interface MyUiBinder extends UiBinder<Widget, ClimbReadNode> {}
//	private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

	public ClimbReadNode()
	{
			
	}

	@Override
	public void init()
	{
//		initWidget(uiBinder.createAndBindUi(this));	
		//setupStars();
		
		initWidget(new FlowPanel());
		this.setStyleName(Resources.INSTANCE.s().climb());
		
		super.init();

	}
	
	@Override
	public void updateAllWidgets()
	{

		GuideStyle s = Resources.INSTANCE.s();
		boolean mobile = BrowserUtil.isMobileBrowser();
		
		// optimized reads
		Node node = ((XmlSimpleModel) getModel()).getXml();
		String name = getAttr(node, "name");
		String number = getAttr(node, "number");
		String length = getAttr(node, "length");
		String extra = getAttr(node, "extra");
		String fa = getAttr(node, "fa");
		String stars = getAttr(node, "stars");
		String grade = getAttr(node, "grade");
		String text = XPath.getText(node);
		
		if (extra!=null && extra.endsWith("B") )
		{
			extra = extra.substring(0, extra.length()-1) + (char) 222; // �
			getModel().put("@extra", extra);
		}
		
		stars = stars.replace('*', (char) 9733).trim();
		
		StringBuilder sb = new StringBuilder();
		sb.append("<table border=0 cellpadding=0 cellspacing=0 ><tr>");
		
		String starsandnum = stars + " " + number;
		if (!mobile)
		{
			//sb.append("<div>");
			
			appendTag(sb,TD, starsandnum, s.climbstars(), null, true, false, false);
			//appendTag(sb,SPAN, number, s.climbnum(), true, false, false);
			appendTag(sb,TD, name, s.climbname(), null, false, true, false);
			appendTag(sb,TD, length, s.climblength(), null, false, false, false);
			appendTag(sb,TD, grade, s.climbgrade(), null, true, false, false);
			appendTag(sb,TD, extra, s.climbextra(), null, true, true, false);
			appendTag(sb,TD, "&nbsp;", null, "width='100%'", true, false, false);
		}
		else
		{
			String t = starsandnum + " " + name + "  " + length + "  " + grade + "  " + extra;
			appendTag(sb, TD, t, s.climbname(), null, true, true, false);
		}
		
		sb.append("</tr>");
		
		
		if (text!=null && ((text=text.trim()).length() > 0) )
		{	
			if (text.indexOf('\n') < 0 || text.indexOf(". ") < 0)
			{
				sb.append("<tr>");
				
				if (!mobile)
					appendTag(sb, TD, "",  s.climbstars(), null, true, false, false);
				
				appendTag(sb,TD, text, s.climbtext(), COLSPAN5, true, true, true);
				
				sb.append("</tr>");
			}
			else
			{
				sb.append("<tr>");
						
				if (mobile)
					sb.append("<tr>");
				else
					sb.append("<tr><td></td>");
						
				sb.append("<td colspan='5'><table cellpadding=0 cellspacing=0 border=0 >");
				
				String[] lines = text.split("\n");
				for (String line: lines)
				{
					line = line.trim();
					int idx = line.indexOf(". ");
					int idx2 = -1;
					if (idx > 0)
						idx2=line.indexOf(". ", idx+1);
					
					if (idx2 > 0 && idx2 < 16)
						idx = idx2;
						
						
					String label = "";
					String multitext = line;
					
					if (label.length() > 2 && label.startsWith("(") && Character.isDigit( label.charAt(1) ) ) 
					{
						label = label.substring(1);
					}
					
					if (line.length()> 1 && Character.isDigit( line.charAt(0) ) && idx > 0 && idx < 16 )
					{
						label = line.substring(0,idx);
						multitext = line.substring(idx+2);
						
						//if (label.length() > 2 && label.charAt(1)==')')
						//	label = label.charAt(0) + "." + label.substring(2);
						
						//label = label.replace(")","");
						//label = label.replace("(","");
						
						if (label.length() > 0 && label.length()<=2)
							label += ".";
						
						label = label.trim();
						multitext = multitext.trim();
						
					}
					
					
					sb.append("<tr>");
					
					if (StringUtil.isNotEmpty(label))
					{
						appendTag(sb, TD, label, s.climbmultilabel(), null, true, true, false);
						appendTag(sb, TD, multitext, s.climbmultitext(), null, true, true, false);
					}
					else
					{
						appendTag(sb, TD, multitext, s.climbmultitext(), "colspan='2'", true, true, false);
					}
					sb.append("</tr>");
				}
				
				sb.append("</table></td></tr>");
			}
		}
		
		if (StringUtil.isNotEmpty(fa))
		{
			if (mobile)
				sb.append("<tr>");
			else
				sb.append("<tr><td></td>");
			
			appendTag(sb,TD, fa, s.climbfa(), COLSPAN5, false, true, false);
			sb.append("</tr>");
		}
		sb.append("</table>");
		
		this.getWidget().getElement().setInnerHTML(sb.toString());
//		
//		
//		nameLabel.setVisible( StringUtil.isNotEmpty(getModel().get("@name")) );
//		lengthLabel.setVisible( StringUtil.isNotEmpty(getModel().get("@length")) );
//		
//		if (BrowserUtil.isMobileBrowser())
//		{
//			// TODO: make conditional in CSS
//			nameLabel.getElement().getStyle().setDisplay(Display.INLINE);
//			lengthLabel.getElement().getStyle().setDisplay(Display.INLINE);
//			gradeLabel.getElement().getStyle().setDisplay(Display.INLINE);
//			numLabel.getElement().getStyle().setDisplay(Display.INLINE);
//			textLabel.getElement().getStyle().setMarginLeft(0, Unit.PX);
//		}
//		
//		super.updateAllWidgets();
//		setupStars();
		
		
	}
	
	private void appendTag(StringBuilder sb, String tag, String text, String style, String attrs, boolean renderIfEmpty, boolean encode, boolean multiline)
	{
		if (renderIfEmpty || (text!=null && text.length()>0) )
		{
		
			sb.append("<").append(tag);
			if (style!=null)
				sb.append(" class='").append(style).append("' ");
				
			if (attrs!=null)
				sb.append(" ").append(attrs);
			
			sb.append(" >");
			if (encode)
			{
				if (multiline)
					sb.append(getConvertedText(text));
				else
					sb.append(StringEscapeUtils.escapeHtml(text));
			}
				
			else
				sb.append(text);
			sb.append("</").append(tag).append(">");
		}
	}

	public static String getConvertedText(String text)
	{
		if (text==null)
			return null;
		
		String ret = text;
		ret = ret.replaceAll("<br/>","\n");
		ret = StringEscapeUtils.escapeHtml(ret);
		ret = ret.replaceAll("\n","<br/>");
		return ret;
	}
	
	private static String getAttr(Node node, String name)
	{
		String ret = ((Element)node).getAttribute(name);
		if (ret==null)
			ret = "";
		
		return ret;
	}

//	private void setupStars()
//	{
//		//starsImage.setResource(getStarsResource());
//		
//		starsLabel.setText(getStarsString());
//		
//	}
//
//	@UiFactory
//	public ClimbReadNode getThis()
//	{
//		return this;
//	}
//	
//
//	
//	public String getStarsString()
//	{
//		String stars = (String) getModel().get("@stars");
//		int snum = 0;
//		if (stars!=null)
//			snum = stars.trim().length();
//		
//		String ret = null;
//		switch (snum)
//		{
//			case 1:
//				ret = STAR1;
//				break;
//			case 2:
//				ret = STAR2;
//				break;
//			case 3:
//				ret = STAR3;
//				break;
//			default:
//				ret = "";
//				
//		}
//		return ret;
//	}
//	
//
//	public ImageResource getStarsResource()
//	{
//		String stars = (String) getModel().get("@stars");
//		int snum = 0;
//		if (stars!=null)
//			snum = stars.trim().length();
//		
//		ImageResource ir = null;
//		switch (snum)
//		{
//			case 1:
//				ir = Resources.INSTANCE.star1();
//				break;
//			case 2:
//				ir = Resources.INSTANCE.star2();
//				break;
//			case 3:
//				ir = Resources.INSTANCE.star3();
//				break;
//			default:
//				ir = Resources.INSTANCE.star0();
//				
//		}
//		return ir;
//	}
}
