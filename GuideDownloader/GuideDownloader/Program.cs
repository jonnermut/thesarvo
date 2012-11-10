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
        static void Main(string[] args)
        {
            XmlDocument config = new XmlDocument();
            config.Load(@"C:\Users\jnermut.ECLAUS\Documents\My Dropbox\code\thesarvoguide\war\data\config.xml");

            XmlNodeList nl = config.SelectNodes("//listItem");

            foreach (XmlNode node in nl)
            {
                XmlAttribute viewId = node.Attributes["viewId"];

                if (viewId != null)
                {
                    String[] split = viewId.Value.Split('.');
                    if (split.Length > 1)
                    {
                        String id = split[1];
                        String url = "http://www.thesarvo.com/confluence/plugins/servlet/guide/xml/" + id;

                        GetURL(url);

                        XmlDocument doc = new XmlDocument();
                        doc.Load(GetSavePath(url));

                        XmlNodeList images = doc.SelectNodes("//image");

                        foreach (XmlNode image in images)
                        {
                            String src = GetAttr(image, "src");
                            String width = GetAttr(image, "width");

                            String url1 = AttachmentUrl(id, src, false, width);
                            String url2 = AttachmentUrl(id, src, true, width);

                            GetURL(url1);
                            GetURL(url2);
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

        static void GetURL(String url)
        {
            BinaryReader br = null;
            FileStream fs = null;

            try
            {
                String filepath = GetSavePath(url);

                Console.Out.WriteLine("opening " + url + " and saving to " + filepath);
                HttpWebRequest myReq = (HttpWebRequest)WebRequest.Create(url);
                myReq.Headers.Remove("Accept-Encoding");
                myReq.Headers.Add("Accept-Encoding", "none");
                //myReq.Timeout = 20000;
                myReq.IfModifiedSince = new DateTime(2003, 1, 1);

                WebResponse wr = myReq.GetResponse();

                if (wr.ContentLength == 0)
                    throw new Exception("Content length was zero!");

                
                br = new BinaryReader(wr.GetResponseStream());
                

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

            }
            catch (Exception e)
            {
                Console.Out.WriteLine("!!! Error: " + e.ToString());
            }
            finally
            {
                if (fs!=null)
                    fs.Close();

                if (br!=null)
                    br.Close();
            }
        }

        private static String GetSavePath(String url)
        {
            String filepath = @"c:\GuideData\" + Uri.EscapeDataString(url);
            return filepath;
        }

    }
}
