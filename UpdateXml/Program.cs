using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.IO;
using System.Diagnostics;
using System.Net;

namespace UpdateXml
{
    class Program
    {
        public static XmlDocument xmlIndex = new XmlDocument();

        public static string basePath = @"C:/guides/craglets/";

        public static string xmlPath;
        public static string attachmentPath;
        public static string iconsPath;

        public static string baseUrl = "http://www.thesarvo.com/confluence";
        public static string pageUrl = "http://www.thesarvo.com/confluence/display/thesarvo/";

        public static string pass = "&os_username=jnermut&os_password=jnermut";

        public static bool doIndex = true;
        public static bool doTransform = true;
        
        
        static void Main(string[] args)
        {
            if (args.Length > 0)
            {
                basePath = args[0];

                for (int i = 0; i < args.Length; i++)
                {
                    if (args[i].ToLower() == "-baseurl" && i+1<args.Length)
                    {
                        baseUrl = args[i + 1];
                    }
                    if (args[i].ToLower() == "-pageurl" && i + 1 < args.Length)
                    {
                        pageUrl = args[i + 1];
                    }
                }

            }

            Console.WriteLine("basePath=" + basePath);
            Console.WriteLine("baseUrl=" + baseUrl);
            Console.WriteLine("pageUrl=" + pageUrl);

            xmlPath = basePath + @"xml/";
            attachmentPath = basePath + @"attachments/";
            iconsPath = basePath + @"icons/";
            
            xmlIndex = GetXml("index");
            SyncGuide();
            

        }



        static void SyncGuide()
        {
            XmlElement guidesNode = (XmlElement) xmlIndex.SelectSingleNode("guides");
            if (GetAttr(guidesNode, "doIndex") == "false")
                doIndex = false;
            if (GetAttr(guidesNode, "doTransform") == "false")
                doTransform = false;

            XmlNodeList guides = xmlIndex.SelectNodes("guides/guide");

            foreach (XmlNode guide in guides)
            {
                try
                {
                    string guidename = GetAttr(guide, "name"); // guide.Attributes["name"].Value;
                    string guidepath = GetAttr(guide, "path");
                    string name2 = guidename.Replace(" ", "_");

                    if (guidepath == null || guidepath.Length == 0)
                        guidepath = pageUrl;

                    string url = guidepath + guidename + "?guide.action=";
                    XmlDocument guideXml = GetXmlFromPage(url + "showxml" + pass);
                    XmlDocument attach = GetXmlFromPage(url + "showattach" + pass);

                    //guideXml.Save(xmlPath + name2 + ".xml");
                    bool changed = SaveXml(guideXml, xmlPath + name2 + ".xml");

                    String dir = attachmentPath + name2;
                    if (!Directory.Exists(dir))
                        Directory.CreateDirectory(dir);

                    foreach (XmlNode attachment in attach.SelectNodes("attachments/attachment"))
                    {
                        String filename = attachment.Attributes["filename"].InnerText.Trim();
                        String modificationDate = attachment.Attributes["modificationDate"].InnerText;
                        String fileurl = baseUrl + attachment.Attributes["url"].InnerText;


                        int day = int.Parse(modificationDate.Substring(0, 2));
                        int month = int.Parse(modificationDate.Substring(3, 2));
                        if (month > 12)
                            month = 1;

                        int year = int.Parse(modificationDate.Substring(6, 4));
                        DateTime dt = new DateTime(year, month, day);

                        //DateTime.Parse(modificationDate);



                        String localfile = dir + "/" + filename.ToLower();

                        if (!File.Exists(localfile) || File.GetLastWriteTime(localfile).CompareTo(dt) < 0)
                        {
                            GetURL2(fileurl + "?" + pass, localfile);

                        }



                    }

                    string graphlocal = dir + "/" + "graph.pdf";
                    if (changed || !File.Exists(graphlocal) )
                    {
                        string graphurl = baseUrl + "/plugins/servlet/graph?page=" + guidename;
                        
                        GetURL2(graphurl, graphlocal);
                    }



                    //if (doTransform)
                    //    GuideConv(guideXml, name2);
                }
                catch (Exception e)
                {
                    Console.Out.WriteLine(e);
                }

            }
        }

        /* Old crap
         * 
        static void GuideConv(XmlDocument guideXml, string name)
        {
            string name3 = name + ".idx.xml";

            XmlDocument newDoc = new XmlDocument();
            newDoc.InnerXml = "<Root><Story></Story></Root>";
            XmlNode story = newDoc.SelectSingleNode("Root/Story");
            
            XmlNodeList nodes = guideXml.SelectNodes("guide/*");

            foreach (XmlNode node in nodes)
            {
                switch (node.Name)
                {
                    case "text":
                        string clazz = GetAttr(node,"class");
                        if (clazz == null || clazz.Length == 0)
                            clazz = "text";

                        XmlNode textNode = newDoc.CreateElement(clazz);

                        String innerText = node.InnerText.Trim() + "\n";
                        
                        innerText = innerText.Replace("   ", " ");
                        innerText = innerText.Replace("  ", " ");
                        innerText = innerText.Replace(".....", "...");
                        innerText = innerText.Replace("....", "...");

                        textNode.InnerText = innerText;

                        String innerXml = textNode.InnerXml;
                        innerXml = ReplaceAnchor(innerXml);
                        textNode.InnerXml = innerXml;

                        story.AppendChild(textNode);
                        break;
                    case "problem":
                    case "climb":
                        XmlNode climbHeading = newDoc.CreateElement("ClimbHeading");
                        
                        string stars = GetAttr(node, "stars").Trim();
                        
                        //if (stars.Length > 0)
                        //    stars += " ";
                        //XmlNode imgNode = newDoc.CreateElement("Image");
                        string hr = "file:///" + iconsPath + "p" + stars.Length + "star.png";
                        //AddAttr(imgNode, "href", hr);

                        String imageXml = GetImageXml(hr);

                        String text = imageXml + " ";

                        String number = GetAttr(node, "number").Trim();
                        if (number.Length > 0)
                            text += number + " ";

                        String name2 = GetAttr(node, "name").Trim();
                        if (name2.Length > 0)
                            text += name2 + "  ";

                        String length = GetAttr(node, "length").Trim();
                        if (length.Length > 0)
                            text += length + "  ";

                        String grade = GetAttr(node, "grade").Trim();
                        if (grade.Length > 0)
                            text += grade + "  ";

                        String extra = GetAttr(node, "extra").Trim();
                        extra = ReplaceAnchor(extra);

                        if (extra.Length>0)
                            text += extra;

                        text += "\n";
                        
                        //climbHeading.InnerText += text;
                        //climbHeading.PrependChild(imgNode);
                        climbHeading.InnerXml = text;
                        
                        story.AppendChild(climbHeading);

                        if (doIndex && node.Name == "climb" && grade.Length > 0)
                        {
                            // add index tags
                            String grade2 = grade.Trim();
                            String name4 = name2;
                            if (name4.Length > 30)
                                name4 = name4.Substring(0, 26) + "...";

                            grade2 = grade2.Split('/')[0];
                            if (grade2.Length == 1)
                                grade2 = "0" + grade2;
                            
                            int g=0;
                            if (grade2.Length>0 )
                            {
                                //string stars2 = stars + "    ".Substring(0, 3 - stars.Length);

                                String indexTag = grade2 + "\t" + stars + "\t" + name4 + "\n";
                                String alphaTag = name4 + "\t" + grade2 + "\t" + stars +"\n";
                                AppendNode(newDoc, story, "gradeIndexTag", indexTag);
                                AppendNode(newDoc, story, "alphaIndexTag", alphaTag);
                            }

                        }

                        AppendNode(newDoc, story, "ClimbText", node.InnerText.TrimEnd() + "\n");

                        break;
                    
                    case "image":
                        string src = GetAttr(node, "src").Trim();
                        XmlNode image = newDoc.CreateElement("Image");

                        string href = "file:///" + attachmentPath + name + "/" + src.ToLower();

                        string href2 = href.Replace(".jpg", ".pdf").Replace(".png", ".pdf");
                        if (File.Exists(href2.Replace("file:///","")) )
                            href = href2;

                        AddAttr(image, "id", src);
                        AddAttr(image, "href", href);
                        story.AppendChild(image);
                        // add br
                        XmlNode br = newDoc.CreateElement("text");
                        br.InnerText = " \n";
                        story.AppendChild(br);
                        // TODO: width / dpi??
                        break;

                }
            }
            String file2 = xmlPath + name3;
            SaveXml(newDoc, file2);


        }
         * */

        private static bool SaveXml(XmlDocument newDoc, String file2)
        {
            String file3 = file2 + ".tmp";

            XmlTextWriter mtw = new XmlTextWriter(file3, Encoding.UTF8);
            mtw.Formatting = Formatting.None;
            newDoc.Save(mtw);
            mtw.Close();
            
            bool move = true;
            if (File.Exists(file2))
            {
                string oldC = File.ReadAllText(file2);
                string newC = File.ReadAllText(file3);
                if (oldC == newC)
                {
                    Console.WriteLine("Not overwriting " + file2 + " as nothing has changed");

                    move = false;
                }
            }
            if (move)
            {
                Console.WriteLine("Writing to " + file2);
                File.Delete(file2);
                File.Move(file3, file2);
            }
            // delete tmp file
            File.Delete(file3);

            return move;
        }

        private static String ReplaceAnchor(String extra)
        {
            String anchorXml = GetImageXml("file:///C:/MtWellingtonGuide/icons/rapanchor.ai");
            extra = extra.Replace("↓", anchorXml); // Þ
            return extra;
        }

        private static String GetImageXml(String hr)
        {
            String imageXml = "<Image href='" + hr + "' />";
            return imageXml;
        }

        private static void AppendNode(XmlDocument newDoc, XmlNode story, String nodeName, String innerXml)
        {
            XmlNode indexNode = newDoc.CreateElement(nodeName);
            indexNode.InnerText = innerXml ;
            story.AppendChild(indexNode);
        }

        static void AddAttr(XmlNode node, string name, string val)
        {
            XmlAttribute attr = node.OwnerDocument.CreateAttribute(name);
            attr.Value = val;
            node.Attributes.Append(attr);
        }

        static string GetAttr(XmlNode node, string name)
        {
            XmlAttribute attr = node.Attributes[name];
            if (attr == null)
                return "";
            else
                return attr.Value;
        }

        static XmlDocument GetXmlFromPage(String url)
        {
            String html = GetURL(url);
            int start = html.IndexOf("guide.xml.start") + 15;
            int length = html.IndexOf("guide.xml.end") - start;


            XmlDocument ret = new XmlDocument();
            if (start >= 0 && length > 0)
            {
                String xml = html.Substring(start, length).Trim();
                ret.LoadXml(xml);
            }
            return ret;
        }

        static string GetURL(String url)
        {
            String ret = "";
            Console.Out.WriteLine("opening " + url);
            try
            {
                HttpWebRequest myReq = (HttpWebRequest)WebRequest.Create(url);
                myReq.Headers.Remove("Accept-Encoding");
                myReq.Headers.Add("Accept-Encoding", "none");
                //myReq.Timeout = 20000;
                myReq.IfModifiedSince = new DateTime(2003, 1, 1);

                ret = new StreamReader(myReq.GetResponse().GetResponseStream()).ReadToEnd();
            }
            catch (Exception e)
            {
                Console.Out.WriteLine("error " + e.ToString());
            }
            return ret;

        }

        static void GetURL2(String url, String filepath)
        {
            try
            {
                Console.Out.WriteLine("opening " + url + " and saving to " + filepath);
                HttpWebRequest myReq = (HttpWebRequest)WebRequest.Create(url);
                myReq.Headers.Remove("Accept-Encoding");
                myReq.Headers.Add("Accept-Encoding", "none");
                //myReq.Timeout = 20000;
                myReq.IfModifiedSince = new DateTime(2003, 1, 1);

                BinaryReader br = new BinaryReader(myReq.GetResponse().GetResponseStream());

                FileStream fs = System.IO.File.OpenWrite(filepath);
                byte[] buffer = new Byte[4096];
                while (true)
                {
                    int count = br.Read(buffer, 0, 4096);
                    if (count == 0)
                        break;
                    fs.Write(buffer, 0, count);

                }
                fs.Close();
                br.Close();
            }
            catch (Exception e)
            {
                Console.Out.WriteLine("Error: " + e.ToString());
            }
            finally
            {

            }
        }

        protected static XmlDocument GetXml(string name)
        {
            XmlDocument ret = new XmlDocument();

            //ret.Load( Server.MapPath( "guides/" + name + ".xml" ) );

            ret.Load(xmlPath + name + ".xml");

            return ret;

        }

    }
}
