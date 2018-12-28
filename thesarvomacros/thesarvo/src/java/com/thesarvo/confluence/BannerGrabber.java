package com.thesarvo.confluence;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import org.apache.log4j.Logger;

public class BannerGrabber extends Thread
{
	private static final int DELAY = 1000 * 60  * 10;

	static Logger log = Logger.getLogger(BannerGrabber.class);
	
	@Override
	public void run()
	{
		super.run();
		
		while (true)
		{
			try
			{
			
				Thread.sleep(DELAY);
		
				getImage();
			}
			catch (Throwable t)
			{
				log.error("Error getting banner image", t);
			}
		}
		

	}

	public static void main(String[] args) throws Exception
	{
		getImage();
	}
	
	private static void getImage() throws IOException, MalformedURLException
	{
		BufferedImage img = javax.imageio.ImageIO.read( new URL("https://rosebayhigh.education.tas.edu.au/wp-content/uploads/webcampic-large.jpg") );

		//BufferedImage subimage = img.getSubimage(0, 170, 1600, 128);
		BufferedImage subimage = img.getSubimage(0, 520, 1600, 128);
		
		long sample = 0;
		int samples = 0;
		for (int x=0; x < 1600; x+=10)
		{
			for (int y=0;y<128;y+=10)
			{
				int p = 0;
				int pixel = subimage.getRGB(x, y) & 0xFFFFFF;
				
				p += pixel % 256;
				pixel = pixel >>> 8;
				p += pixel % 256;
				pixel = pixel >>> 8;
				p += pixel % 256;
				
				sample += p / 3;
				samples ++;
			}
		}
		sample = sample / samples;
		
		log.warn("bannerGrabber sample=" + sample);
		if (sample > 50)
		{
			javax.imageio.ImageIO.write(subimage , "jpg", new File("/var/lib/tomcat6/webapps/ROOT/banner.jpg") );
		}
	}
}
