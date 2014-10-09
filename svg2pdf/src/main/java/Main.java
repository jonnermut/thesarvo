import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;

import com.kitfox.svg.*;

import javax.imageio.ImageIO;

import com.itextpdf.awt.PdfGraphics2D;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfTemplate;
import com.itextpdf.text.pdf.PdfWriter;
import com.kitfox.svg.xml.StyleAttribute;


/**
 * Created by jon on 6/10/2014.
 */
public class Main
{
    /*
    public static void main(String[] argv) throws TranscoderException, FileNotFoundException {
        Transcoder transcoder = new PDFTranscoder();
        TranscoderInput transcoderInput = new TranscoderInput(new FileInputStream(new File("/git/svg2pdf/cairn.svg")));
        TranscoderOutput transcoderOutput = new TranscoderOutput(new FileOutputStream(new File("/git/svg2pdf/cairn.pdf")));
        transcoder.transcode(transcoderInput, transcoderOutput);
    }
    */

    public static void main(String[] args) throws IOException, SVGException, DocumentException
    {


        File f = new File("/git/svg2pdf/cairn.svg");
        SVGUniverse svgUniverse = new SVGUniverse();
        SVGDiagram diagram = svgUniverse.getDiagram(svgUniverse.loadSVG(f.toURL()));
        SVGRoot r = diagram.getRoot();

        Text t = new Text();
        t.appendText("blah");


        for (int i=0;i<r.getNumChildren();i++)
        {
            SVGElement e = r.getChild(i);

            if (e instanceof Text)
            {
                Text t = (Text) e;
                StyleAttribute ff = t.getStyleAbsolute("font-family");
                String sff = "" + ff.getStringValue();
                int comma = sff.indexOf(',');
                if (comma > -1)
                {
                    ff.setStringValue(sff.substring(0,comma));
                    t.rebuild();
                }

                Shape shape = t.getShape();
                Tspan ts = (Tspan) t.getChild(0);

                Shape s2 = ts.getShape();
                int x = 0;
            }
        }
        
        /*
        BufferedImage bi = new BufferedImage((int) diagram.getWidth()*4, (int) diagram.getHeight()*4, BufferedImage.TYPE_INT_ARGB);
        Graphics2D ig2 = bi.createGraphics();
        ig2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        diagram.render(ig2);
        ig2.dispose();

        ImageIO.write(bi, "PNG", new File("cairn.png"));
        */
        int w = (int) diagram.getWidth();
        int h = (int) diagram.getHeight();
        Document document = new Document(new Rectangle(w,h ));
        // step 2
        PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream("cairn3.pdf"));
        // step 3
        document.open();
        // step 4
        PdfContentByte cb = writer.getDirectContent();

        PdfTemplate template = cb.createTemplate(w, h);

        Graphics2D g2d = new PdfGraphics2D(template, w, h);
        //SVGDocument city = factory.createSVGDocument(new File(resource).toURL()
         //       .toString());
        //GraphicsNode mapGraphics = builder.build(ctx, city);
        //mapGraphics.paint(g2d);
        diagram.render(g2d);

        g2d.dispose();

        cb.addTemplate(template, 0, 0);
        // step 5
        document.close();

    }
}
