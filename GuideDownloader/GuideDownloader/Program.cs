using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;
using System.Net;
using System.IO;

namespace GuideDownloader
{
    class Program
    {
		static void HandleViewId (XmlAttribute viewId)
		{
			String[] split = viewId.Value.Split('.');
    	    if (viewId.Value.StartsWith("guide.") && split.Length > 1)
    	    {
    	        String id = split[1];
    	        String url = "http://www.thesarvo.com/confluence/plugins/servlet/guide/xml/" + id;
    	
				string path = GetURL(url, "" + id + ".xml");
    	
    	        XmlDocument doc = new XmlDocument();

				if (path!=null)
				{
        	        doc.Load(path);
        	
        	        XmlNodeList images = doc.SelectNodes("//image");
        	
        	        foreach (XmlNode image in images)
        	        {
        	            String src = GetAttr(image, "src");
        	            String width = GetAttr(image, "width");
        	
        	            String url1 = AttachmentUrl(id, src, false, width);
        	            String url2 = AttachmentUrl(id, src, true, width);
        	
						GetURL(url1, "" + id + "-" + src.ToLower());
						GetURL(url2, "" + id + "-t-" + src.ToLower());
        	        }
				}
    	    }
        	
		}
        
        static void Main(string[] args)
        {
            XmlDocument config = new XmlDocument();
            config.Load(@"/git/thesarvo/thesarvo_iphone_1.3/guide/config.xml");

            XmlNodeList nl = config.SelectNodes("//listItem");

            foreach (XmlNode node in nl)
            {
                XmlAttribute viewId = node.Attributes["viewId"];

                if (viewId != null)
                {
					for (int i=0;i<3;i++)
					{
						try
						{
							HandleViewId (viewId);
							break;
						}						
			            catch (Exception e)
			            {
			                Console.Out.WriteLine("!!! Error: " + e.ToString() + " retrying try=" + i);
			            }
					}
				}
            }

        }

        static string GetAttr(XmlNode node, string name)
        {
            XmlAttribute attr = node.Attributes[name];
            if (attr == null)
                return "";
            else
                return attr.Value;
        }

        static String AttachmentUrl(string pageid, string src, bool thumbnail, string width)
        {
            if (thumbnail)
                return "http://www.thesarvo.com/confluence/download/thumbnails/" + pageid + "/" + src;
            else
            {
                if (width!=null && width.Length>0)
                    return "http://www.thesarvo.com/confluence/plugins/servlet/guide/image/" + pageid + "/" + src + "?width=" + width;
                else
                    return "http://www.thesarvo.com/confluence/plugins/servlet/guide/image/" + pageid + "/" + src ;
	        }
        }

		static string GetURL(String url, String filename)
        {
            BinaryReader br = null;
            FileStream fs = null;
			String filepath = GetSavePath(url, filename);
            try
            {
                

                Console.Out.WriteLine("opening " + url + " and saving to " + filepath);
                HttpWebRequest myReq = (HttpWebRequest)WebRequest.Create(url);
                myReq.Headers.Remove("Accept-Encoding");
                myReq.Headers.Add("Accept-Encoding", "none");
                //myReq.Timeout = 20000;
                myReq.IfModifiedSince = new DateTime(2003, 1, 1);

                WebResponse wr = myReq.GetResponse();

                if (wr.ContentLength == 0) 
                    throw new Exception("Content length was zero!");

				string lastmod = wr.Headers["LastModified"];

				if (lastmod == null)
				{
					lastmod = wr.Headers["ETag"];
					
				}


				if (lastmod != null && lastmod.Length > 0)
				{
					lastmod = lastmod.Replace("\"","");
					try
					{
						long javadt = long.Parse(lastmod);
						DateTime dt = ConvertJavaMiliSecondToDateTime(javadt);

						if (File.Exists(filepath))
						{
							DateTime filedt = File.GetLastWriteTime(filepath);
							if (filedt.CompareTo(dt) > 0)
							{
								Console.Out.WriteLine("Not downloading as it hasnt changed: " + url);
								wr.Close();
								return null;
							}
						}
					}
					catch (Exception e)
					{}
				}

				//string expectedlength = wr.Headers["ExpectedLength"];
                
                br = new BinaryReader(wr.GetResponseStream());
                
				System.IO.File.Delete(filepath);

                byte[] buffer = new Byte[4096];
                while (true)
                {
                    int count = br.Read(buffer, 0, 4096);
                    if (count == 0)
                        break;
                    
                    if (fs==null)
                        fs = System.IO.File.Open(filepath, FileMode.Create);

                    fs.Write(buffer, 0, count);

                }
				return filepath;

            }
            catch (Exception e)
            {
                Console.Out.WriteLine("!!! Error: " + url + "\n" + e.ToString());
				//System.IO.File.Delete(filepath);
            }
            finally
            {
                if (fs!=null)
                    fs.Close();

                if (br!=null)
                    br.Close();
            }
			
			return null;
        }

		private static String GetSavePath(String url, String filename)
        {
            //String filepath = @"/git/thesarvo/thesarvo_iphone_1.3/www/data/" + Uri.EscapeDataString(url).Replace("%","-");
            
			/*
			String filename = new Uri (url).Segments.Last ();
			String ext = ".xml";
			int idx = filename.LastIndexOf (".");
			if (idx > -1) {
				ext = filename.Substring (idx).ToLower();
			}

			String filepath = @"/git/thesarvo/thesarvo_iphone_1.3/www/data/" + HashFNV1a(url) + ext;


			return filepath;
			*/
			return @"/git/thesarvo/thesarvo_iphone_1.3/www/data/" + filename;
        }

		public static DateTime ConvertJavaMiliSecondToDateTime(long javaMS)

		{

			DateTime UTCBaseTime = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

			DateTime dt = UTCBaseTime.Add(new TimeSpan(javaMS *

			TimeSpan.TicksPerMillisecond)).ToLocalTime();

			return dt;

		}

		public static ulong HashFNV1a(string str)
		{
			return HashFNV1a( System.Text.Encoding.UTF8.GetBytes(str) );
		}

		// From https://gist.github.com/rasmuskl/3786618
		// FNV-1a (64-bit) non-cryptographic hash function.
		// Adapted from: http://github.com/jakedouglas/fnv-java
		public static ulong HashFNV1a(byte[] bytes)
		{
			const ulong fnv64Offset = 14695981039346656037;
			const ulong fnv64Prime = 0x100000001b3;
			ulong hash = fnv64Offset;
		 
			for (var i = 0; i < bytes.Length; i++)
			{
				hash = hash ^ bytes[i];
				hash *= fnv64Prime;
			}
		 
			return hash;
		}

    }
}
