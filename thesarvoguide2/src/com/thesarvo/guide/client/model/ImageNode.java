package com.thesarvo.guide.client.model;

import java.util.ArrayList;
import java.util.List;

import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.thesarvo.guide.client.controller.Controller;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class ImageNode extends NodeModel
{
	String src = "";
	String width = "auto";
	String height = "auto";
	Boolean noPrint = false;
	Boolean legend = false;
	String legendTitle = "";
	String legendFooter = "";
	int legendX;
	int legendY;
	String linkedToId;
	
	List<String> legendValues = new ArrayList<String>();
	
	List<DrawingObject> drawingObjects = new ArrayList<DrawingObject>();
	
	static int id = 2;


	
	public ImageNode(XmlSimpleModel model)
	{
		super(model);
	}

	/**
	 * @return the src
	 */
	public String getSrc()
	{
		if (model != null)
			return model.get("@src");
		
		return src;
	}

	public String getUrl()
	{
		String src = StringUtil.string(getSrc());
		String width = StringUtil.string(getWidth());
		src = Controller.get().getAttachmentUrl(src, false, width);
		return src;
	}
	
	/**
	 * @param src the src to set
	 */
	public void setSrc(String src)
	{
		if (model != null)
			model.put("@src",src);
		else
			this.src = src;
	}

	/**
	 * @return the width
	 */
	public String getWidth()
	{
		if (model != null)
			return model.get("@width");

		
		return width;
	}

	/**
	 * @param width the width to set
	 */
	public void setWidth(String width)
	{
		if (model != null)
			model.put("@width",width);
		
		this.width = width;
	}

	/**
	 * @return the noPrint
	 */
	public Boolean getNoPrint()
	{
		if (model != null)
			return model.getBoolean("@noPrint");

		
		return noPrint;
	}

	/**
	 * @param noPrint the noPrint to set
	 */
	public void setNoPrint(Boolean noPrint)
	{
		if (model != null)
			model.put("@noPrint",""+noPrint);
		
		this.noPrint = noPrint;
	}

	/**
	 * @return the legend
	 */
	public Boolean getLegend()
	{
		if (model != null)
			return model.getBoolean("@legend");

		
		return legend;
	}

	/**
	 * @param legend the legend to set
	 */
	public void setLegend(Boolean legend)
	{
		if (model != null)
			model.put("@legend",""+legend);
		else
			this.legend = legend;
	}

	/**
	 * @return the legendTitle
	 */
	public String getLegendTitle()
	{
		if (model != null)
			return model.get("@legendTitle");
		
		return legendTitle;
	}

	/**
	 * @param legendTitle the legendTitle to set
	 */
	public void setLegendTitle(String legendTitle)
	{
		if (model != null)
			model.put("@legendTitle",""+legendTitle);
		else
			this.legendTitle = legendTitle;
	}

	/**
	 * @return the legendFooter
	 */
	public String getLegendFooter()
	{
		if (model != null)
			return model.get("@legendFooter");
		
		return legendFooter;
	}

	/**
	 * @param legendFooter the legendFooter to set
	 */
	public void setLegendFooter(String legendFooter)
	{
		if (model != null)
			model.put("@legendFooter",""+legendFooter);
		else
			this.legendFooter = legendFooter;
	}

	/**
	 * @return the legendX
	 */
	public int getLegendX()
	{
		if (model != null)
			return model.getInt("@legendx");
		
		return legendX;
	}

	/**
	 * @param legendX the legendX to set
	 */
	public void setLegendX(int legendX)
	{
		if (model != null)
			model.put("@legendx",""+legendX);
		else
			this.legendX = legendX;
	}

	/**
	 * @return the legendY
	 */
	public Integer getLegendY()
	{
		if (model != null)
			return model.getInt("@legendy");
		
		return legendY;
	}

	/**
	 * @param legendY the legendY to set
	 */
	public void setLegendY(Integer legendY)
	{
		if (model != null)
			model.put("@legendy",""+legendY);
		else
			this.legendY = legendY;
	}

	/**
	 * @return the legendValues
	 */
	public List<String> getLegendValues()
	{
		if (model != null)
		{
			ArrayList<String> ret = new ArrayList<String>();
			for(XmlSimpleModel xsm :  model.getList("legend"))
				ret.add(xsm.get("."));
			
			for(XmlSimpleModel xsm :  model.getList("legend/climb"))
				ret.add(xsm.get("."));

			return ret;
		}
		
		return legendValues;
	}

	/**
	 * @param legendValues the legendValues to set
	 */
	public void setLegendValues(List<String> legendValues)
	{
		if (model != null)
		{
			XPath.removeNodes(model.getXml(), "legend");
			Element el = model.createElement("legend", "");
			XmlSimpleModel xsm = new XmlSimpleModel(el);
			for (String id: legendValues)
			{
				xsm.createElement("climb", "" + id);
			}
		}
		else
			this.legendValues = legendValues;
	}

	/**
	 * @return the drawingObjects
	 */
	public List<DrawingObject> getDrawingObjects()
	{
		if (model != null)
		{
			if (drawingObjects == null)
				drawingObjects = new ArrayList<DrawingObject>();
			else
				drawingObjects.clear();
			
			for(XmlSimpleModel xsm : model.getList("drawing/path") )
			{
				drawingObjects.add( new PathDrawingObject(xsm) );
			}
			
			for(XmlSimpleModel xsm : model.getList("drawing/rect") )
			{
				drawingObjects.add( new RectDrawingObject(xsm) );
			}
			
		}
		
		return drawingObjects;
	}

	/**
	 * @param drawingObjects the drawingObjects to set
	 */
	public void setDrawingObjects(List<DrawingObject> drawingObjects)
	{
		this.drawingObjects = drawingObjects;
	}

	
	public RectDrawingObject newRect()
	{
		RectDrawingObject ret = null;
		if (model != null)
		{
			XmlSimpleModel drawing = getDrawingElement();			
			Element el = drawing.createElement("rect", null);
			ret = new RectDrawingObject(new XmlSimpleModel(el));
		}
		else
		{
			ret = new RectDrawingObject();
		}
		
		drawingObjects.add(ret);
		ret.setId("" + (int)(Math.random() * 100000) ); 
		return ret; 
	}

	public XmlSimpleModel getDrawingElement()
	{
		List<XmlSimpleModel> d = model.getList("drawing");
		if (d == null || d.size() == 0)
		{
			return new XmlSimpleModel(model.createElement("drawing", null));
			
		}
		else
			return d.get(0);
		
	}

	public PathDrawingObject newPath()
	{
		PathDrawingObject pdo = null;
		if (model != null)
		{
			XmlSimpleModel drawing = getDrawingElement();			
			Element el = drawing.createElement("path", null);
			pdo = new PathDrawingObject(new XmlSimpleModel(el));
		}
		else
		{
			pdo = new PathDrawingObject();
		}
		
		
		drawingObjects.add(pdo);
		pdo.setId("" + (int)(Math.random() * 100000) ); 
		return pdo;
	}

	/**
	 * @return the height
	 */
	public String getHeight()
	{
		if (model != null)
			return model.get("@height");

		
		return height;
	}

	/**
	 * @param height the height to set
	 */
	public void setHeight(String height)
	{
		if (model != null)
			model.put("@height",height);
		
		this.height = height;
	}


	
	
}
