package com.thesarvo.confluence;


import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;

import javax.imageio.ImageIO;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.dom4j.Element;
import org.dom4j.Node;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.axis.NumberAxis;
import org.jfree.chart.axis.NumberTickUnit;
import org.jfree.chart.plot.CategoryPlot;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.renderer.category.StackedBarRenderer;
import org.jfree.data.category.DefaultCategoryDataset;

import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.spring.container.ContainerManager;
import com.dytech.common.XMLFacadeException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.DefaultFontMapper;
import com.lowagie.text.pdf.FontMapper;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;

public class GraphServlet extends HttpServlet
{

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	public static void main(String[] args) throws Exception
	{
		GraphServlet g = new GraphServlet();
		g.doGet(null,null);
	}

	@SuppressWarnings("unchecked")
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException
	{
		try
		{
			
			String page = null;

			PlotOrientation plotOrientation = PlotOrientation.VERTICAL;

			JFreeChart chart;

			DefaultCategoryDataset dataset = new DefaultCategoryDataset();

			// dataset =

			// chartData.processData(dataset);


			
			
			boolean problems = false;
			int[] grades = new int[8];
			int total = 0;
			
			Page p = null;
			
			if (req!=null && (page=req.getParameter("page")) !=null)
			{
				p = ((PageManager) ContainerManager.getComponent("pageManager")).getPage("thesarvo", page);
			}
			else if (req!=null && req.getParameter("pageId") !=null)
			{
				p = Service.getPage(req.getParameter("pageId"));
			}
			if (p!=null)
			{
				org.dom4j.Document xml = Service.getGuideXml(p);
				
				
				//NodeList nl = xml.findNodes("//climb");
				
				List<Node> nlc = xml.selectNodes("guide/climb");
				List<Node> nlp = xml.selectNodes("guide/problem");
				
				List<Node> nl = nlc;
				
				if (nlc.size() < nlp.size())
				{
					nl = nlp;
					problems = true;
				}
				
				grades = getGradeCount(nl, problems);
				
				total = nl.size();
				
			}
			else
			{
			
				// test data
				grades[0] = 30;
				grades[1] = 2;
				grades[2] = 3;
				grades[3] = 30;
				grades[4] = 9;
				grades[5] = 18;
				grades[6] = 2;
				grades[7] = 1;
				
				for (int x: grades)
					total += x;
			}
			
			String[] keys = new String[] {Guide.KEY0, Guide.KEY1, Guide.KEY2, Guide.KEY3};
			if (problems)
			{
				keys = new String [] { "VE-2", "3-5", "6-8", "9+" };
			}
			
			dataset.addValue(grades[0],  Guide.CAT0, keys[0]);
			dataset.addValue(grades[1],  Guide.CAT0, keys[1]);
			dataset.addValue(grades[2],  Guide.CAT0, keys[2]);
			dataset.addValue(grades[3],  Guide.CAT0, keys[3]);
			
			if (!problems)
			{
				dataset.addValue(grades[4],  Guide.CAT1, Guide.KEY0);
				dataset.addValue(grades[5],  Guide.CAT1, Guide.KEY1);
				dataset.addValue(grades[6],  Guide.CAT1, Guide.KEY2);
				dataset.addValue(grades[7],  Guide.CAT1, Guide.KEY3);			
			}

			
			String title =  "" + total;
			
			if (problems)
			{
				title += " Problem";
			}
			else
			{	
				title += " Route";
			}
			if (total!=1)
				title += "s";
			
			
			String xLabel = "";
			String yLabel = "";
			boolean legend = !problems;
			boolean tooltips = false;
			boolean urls = false;

			chart = ChartFactory.createBarChart(title, xLabel, yLabel, dataset, plotOrientation, legend, tooltips, urls);

			CategoryPlot plot = chart.getCategoryPlot();

			plot.setRenderer(new StackedBarRenderer());
			
			plot.getRangeAxis().setAutoRangeMinimumSize(5);
			
			plot.getRenderer().setSeriesPaint(0, new Color(0,0,0));

			if (!problems)
				plot.getRenderer().setSeriesPaint(1, new Color(255,100,100));
			
			chart.setBackgroundPaint( Color.white );
			plot.setBackgroundPaint( Color.white );
			
			
			if (total<100)
				((NumberAxis) plot.getRangeAxis()).setTickUnit(new NumberTickUnit(5) );

			if (total<20)
				((NumberAxis) plot.getRangeAxis()).setTickUnit(new NumberTickUnit(2) );			
			

			// write the chart to a PDF file...
			File fileName = new File("c:/temp/jfreechart1.pdf");
			
			int width = 240;
			int height = 240;
			

			
			if (resp!=null)
			{
				if (total > 0)
				{
					String type = req.getParameter("type");
					if (type==null || type.equals("pdf"))
					{
						resp.setContentType("application/pdf");
						writeChartAsPDF(resp.getOutputStream(), chart, width, height, new DefaultFontMapper() );
					}
					else
					{
						resp.setContentType("image/png");
						BufferedImage img = chart.createBufferedImage(200, 200);
						
						ImageIO.write(img, "png", resp.getOutputStream());
						
						//ImageIO.read(input)
						//img.getSubimage(x, y, w, h)
						//writeChartAsPDF(resp.getOutputStream(), chart, 200, 200, new DefaultFontMapper() );
						
					}
					
				}
			}
			else
				saveChartAsPDF(fileName, chart, width, height);

		}
		catch (Exception e)
		{
			e.printStackTrace();
			
			if (resp!=null)
				e.printStackTrace(resp.getWriter());
			
			throw new ServletException(e);

				
		}

	}

	public static void saveChartAsPDF(File file, JFreeChart chart, int width, int height) throws IOException
	{
		OutputStream out = new BufferedOutputStream(new FileOutputStream(file));
		writeChartAsPDF(out, chart, width, height, new DefaultFontMapper() );
		out.close();
	}

	public static void writeChartAsPDF(OutputStream out, JFreeChart chart, int width, int height, FontMapper mapper) throws IOException
	{
		Rectangle pagesize = new Rectangle(width, height);
		// Document document = new Document(pagesize, 50, 50, 50, 50);
		
		Document document = new com.lowagie.text.Document(pagesize);
		try
		{
			PdfWriter writer = PdfWriter.getInstance(document, out);
			document.addAuthor("JFreeChart");
			document.addSubject("Demonstration");
			document.open();
			PdfContentByte cb = writer.getDirectContent();
			PdfTemplate tp = cb.createTemplate(width, height);
			Graphics2D g2 = tp.createGraphics(width, height, mapper);
			Rectangle2D r2D = new Rectangle2D.Double(0, 0, width, height);
			chart.draw(g2, r2D, null);
			g2.dispose();
			cb.addTemplate(tp, 0, 0);
		}
		catch (DocumentException de)
		{
			System.err.println(de.getMessage());
		}
		document.close();
	}

	public static int[] getGradeCount(List<Node> nl, boolean problems)
			throws XMLFacadeException
	{
		int[] grades = new int[8];

		for (Node node : nl)
		{
			//Node node = nl.item(i);

			String grade = getAttr(node, "grade");
			String extra = getAttr(node, "extra");

			String boltchar = new String( new char[] {(char) 222} ) ;
			boolean sport = extra.contains(boltchar)
					|| Guide.BOLT_PAT.matcher(extra).find();

			if (grade != null && grade.length() > 0)
			{
				if (grade.indexOf('/') > 0)
				{
					grade = grade.substring(0, grade.indexOf('/'));
				}
				grade = grade.replace('?', ' ');
				grade = grade.replace('M', ' ');
				grade = grade.replace('A', ' ');
				grade = grade.replace('V', ' ');
				grade = grade.replace('E', '0');
				grade = grade.trim();
				if (grade.indexOf(' ') > 0)
				{
					grade = grade.substring(0, grade.indexOf(' '));
				}
				grade = grade.trim();

				int g = -1;

				try
				{
					g = Integer.parseInt(grade);
				} 
				catch (NumberFormatException e)
				{
				}

				if (g > -1)
				{
					int off = sport ? 4 : 0;

					if (problems)
					{
						if (g < 3)
							grades[0 + off]++;
						else if (g < 6)
							grades[1 + off]++;
						else if (g < 9)
							grades[2 + off]++;
						else
							grades[3 + off]++;
						
					}
					else
					{
						if (g < 16)
							grades[0 + off]++;
						else if (g < 20)
							grades[1 + off]++;
						else if (g < 25)
							grades[2 + off]++;
						else
							grades[3 + off]++;
					}
				}

			}
		}
		return grades;
	}

	
	private static String getAttr(Node node, String attrname)
	{
//		NamedNodeMap oAttrNodeMap = node.getAttributes();
//		if (oAttrNodeMap == null)
//			return "";
//
//		Attr attr = (Attr) oAttrNodeMap.getNamedItem(attrnanme);
//
//		String ret = attr != null ? attr.getValue() : null;

		String ret = ((Element)node).attributeValue(attrname);
		
		if (ret == null)
			ret = "";

		return ret.trim();
		
		
	}
	
}
