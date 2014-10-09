using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using InDesign;
using System.IO;

namespace GuideLayout
{
    class Layout
    {
        public static Application application;
        public static Book book;
        public static BookContents contents;
        public static bool forceUpdate = false;

        public static Dictionary<string, string> config = new Dictionary<string, string>();

        public static Dictionary<string, string> fileCache = new Dictionary<string, string>();

        

        static object miss = System.Reflection.Missing.Value;

        public static string basePath = @"C:\guides\craglets\";
        //public static string basePath = @"D:\Dropbox\My Dropbox\thesarvo\guides\craglets\";
        
        static string bookPath;

        public static List<string> argslist;

        //static List<Climb> index = new List<Climb>();

        static void Main(string[] args)
        {
            Console.WriteLine("Starting...");

            SetupApplication();


            if (args.Length > 0)
            {
                basePath = args[0].Trim();
                Console.WriteLine("basePath=" + basePath);
                bookPath = basePath + @"book\";

                argslist = new List<string>(args);

                if (argslist.Contains("force"))
                {
                    Console.WriteLine("forceUpdate = true");
                    forceUpdate = true;
                }

                if (argslist.Contains("book") )
                {
                    bookPath = basePath + args[ argslist.IndexOf("book")+1 ] + @"\";
                    Console.WriteLine("bookPath=" + bookPath);
                }

                if (argslist.Contains("export") )
                {
                    bool split = argslist.Contains("split");
                    ExportBook(args[argslist.IndexOf("export") + 1], split);
                    return;
                }

                if (argslist.Contains("resize") )
                {
                    Resize();
                }


            }
            LoadConfig(basePath + "config.txt");

            SetupFileCache();

            DoLayout();

            Console.WriteLine("Finished");
            //Console.ReadLine();
        }

        static void LoadConfig(string filepath)
        {
            StreamReader sr = File.OpenText(filepath);

            while (!sr.EndOfStream)
            {
                string line = sr.ReadLine();

                line = line.Trim();

                if (line.Length > 0 && line.IndexOf("=") > 0)
                {
                    string[] split = line.Split('=');

                    if (split.Length > 1)
                    {
                        config[split[0].Trim().ToLower()] = split[1].Trim();
                    }
                }
            }
        }

        

        static void SetupFileCache()
        {
            string conf = GetConfig("ContentLocations");
            
            if (conf!=null)
            {
                string[] locations = conf.Split(',');

                foreach (string location in locations)
                {
                    string[] files = Directory.GetFiles(location, "*.*", SearchOption.AllDirectories);

                    foreach (string file in files)
                    {
                        string[] split = file.Split('\\');
                        string key = split[split.Length - 1];

                        fileCache[key.ToLower()] = file;

                    }
                }
            }
        }

        public static string GetConfig(string key)
        {
            key = key.ToLower();

            if (config.ContainsKey(key))
                return config[key];
            else
                return null;
        }

        static string GetConfig(string key1, string key2)
        {
            return GetConfig(key1 + "." + key2);
        }

        public static string GetFileCache(string key)
        {
            key = key.ToLower();

            if (fileCache.ContainsKey(key))
                return fileCache[key];
            else
                return null;
        }

        static void Resize()
        {
            OpenBook();
            contents = book.BookContents;

            foreach (BookContent bookContent in contents)
            {
                application.ScriptPreferences.UserInteractionLevel = idUserInteractionLevels.idNeverInteract;

                string name = bookContent.FullName;

                Console.WriteLine("Processing " + name);

                if (name.ToLower().Contains(@"c:\guides\craglets\book\") )
                {
                    string newname = name.Replace("book","book 6by9");
                    
                    Console.WriteLine("Replacing " + name + " with " + newname);

                    book.BookContents.Add(newname, book.BookContents.Count);
                    
                    //bookContent.Replace( newname );
                    name = newname;
                }

                Document document = (Document)application.Open(name, true);

                Console.WriteLine("Resizing " + name);
                document.DocumentPreferences.PageHeight = 229;
                document.DocumentPreferences.PageWidth = 152;

                if (document.Modified)
                {
                    Console.WriteLine("Saving " + document.Name);
                    document.Save(miss, false, miss, true);
                    document.Close(idSaveOptions.idNo, miss, miss, false);
                }

                //document.
            }

            // close book
            book.Close(idSaveOptions.idYes, miss, miss, true);

        }

        static void DoLayout()
        {
            OpenBook();
            //book = application.ActiveBook;
            contents = book.BookContents;

            //ExportBook(false);
            
            //Console.WriteLine("Repaginating of " + book.Name);
            //book.Repaginate();

            int sideBarMax = 0;
            int sideBarCount = 0;

            //foreach (BookContent bookContent in contents)

            int skipTo = 1;

            for (int i=skipTo; i<=contents.Count; i++)
            {
                BookContent bookContent = contents[i];

                application.ScriptPreferences.UserInteractionLevel = idUserInteractionLevels.idNeverInteract;

                string name = bookContent.FullName;

                Console.WriteLine("Processing " + name);

                Document document = (Document) application.Open(name, true);

                string sSideBarMax = GetConfig(document.Name.Replace(".indd",""), "SideBarMax");
                if (sSideBarMax != null && sSideBarMax.Length > 0)
                {
                    sideBarMax = Int32.Parse(sSideBarMax);
                    sideBarCount = 1;
                }
                else
                    sideBarCount++;


                Guide guide = new Guide(application, document);
                guide.bookContent = bookContent;
                guide.sideBarMax = sideBarMax;
                guide.sideBarCount = sideBarCount;

                guide.LayoutGuide(forceUpdate || argslist.Contains(document.Name) );

                
            }

            ExportBook(false);

            // close book
            book.Close(idSaveOptions.idYes, miss, miss, true);



        }

        private static void OpenBook()
        {
            string bname = GetConfig("book");

            if (bname == null)
                bname = @"TasmanianClimbingGuide.indb";
            OpenBook(bname);
        }

        private static void SetupApplication()
        {
            //application = new ApplicationClass();

            //InDesign.ApplicationClass App = new InDesign.ApplicationClass();

            Type t = Type.GetTypeFromProgID("InDesign.Application");
            object o = Activator.CreateInstance(t);
            
            //ApplicationClass ac = (ApplicationClass)o;
            application = (Application) o;
            //Application app = (Application)System.Runtime.InteropServices.Marshal.CreateWrapperOfType(o, typeof(ApplicationClass));

            //Application app = (Application)System.Runtime.InteropServices.Marshal.CreateWrapperOfType(o, typeof(Application));

            //application.PDFPlacePreferences.PDFCrop = idPDFCrop.idCropContent;
        }

        private static void ExportBook(string bookname, bool split)
        {
            OpenBook(bookname);
            ExportBook(split);
            book.Close(idSaveOptions.idYes, miss, miss, true);
        }

        private static void OpenBook(string name)
        {
            string path = bookPath + name;
            Console.WriteLine("Opening book:" + path);


            Book currentBook = null;

            try
            {
                currentBook = application.ActiveBook;
            }
            catch (Exception e)
            { }

            if (currentBook == null || currentBook.FullName != path)
            {
                book = (Book)application.Open(path, false);
            }
            else
            {
                book = currentBook;
                Console.WriteLine("Book already open");
            }
             
        }

        private static void UpdateTOC()
        {
            BookContents contents = book.BookContents;
            string name = ((BookContent)contents.FirstItem()).FullName;
            DoUpdateTOC(name, "CragletsTOC");

            name = ((BookContent)contents[contents.Count - 1]).FullName;
            if (name.Contains("Grade Index"))
                DoUpdateTOC(name, "GradeIndexCraglets");

            name = ((BookContent)contents[contents.Count]).FullName;
            if (name.Contains("Name Index"))
                DoUpdateTOC(name, "NameIndexCraglets");


        }

        private static void DoUpdateTOC(string docName, string style)
        {
            Console.WriteLine("Updating TOC in file=" + docName + ", style=" + style);

            Document document = (Document)application.Open(docName, true);
            TOCStyle tocStyle = (TOCStyle)document.TOCStyles[style];
            document.CreateTOC(tocStyle, true, book, miss, true, miss);
            document.Save(miss, false, miss, true);
            document.Close(idSaveOptions.idNo, miss, miss, false);
        }

        private static void ExportBook(bool split)
        {
            Console.WriteLine("Repaginating and TOC of " + book.Name );
            
            book.Repaginate();

            UpdateTOC();

            PDFExportPreset myPDFExportPreset = (PDFExportPreset)application.PDFExportPresets["Craglets"];

            Console.WriteLine("Exporting " + book.Name + " to pdf");

            string name = book.Name.Replace(".indb", ".pdf");

            object which = miss;

            if (!split)
            {
                
                book.Export(idExportFormat.idPDFType, basePath + name, false, myPDFExportPreset, miss, miss, false);
                //book.ExportbasePath + name, false, myPDFExportPreset, miss, miss, false);
            }
            else
            {
                int c = 0;
                List<BookContent> contents = new List<BookContent>();
                foreach (BookContent bc in book.BookContents)
                {
                    contents.Add(bc);

                    if (contents.Count == 7)
                    {
                        ExportDocs(c, contents, myPDFExportPreset);
                        contents.Clear();
                        c++;
                    }
                }
                if (contents.Count > 0)
                    ExportDocs(c, contents, myPDFExportPreset);

            }
        }

        static void ExportDocs(int c, List<BookContent> contents, PDFExportPreset preset)
        {

            
            BookContent[] arr = new BookContent[contents.Count];

            Objects bc = application.CreateCollection( book.BookContents);
            //BookContents bc = new BookContents();

            for (int i = bc.Count; i > 0; i--)
            {
                if (! contents.Contains((BookContent) bc[i]) )
                    bc.Remove(i);
            }

            //for (int i = 0; i < contents.Count; i++)
            //    bc.Add(contents[i],i);

                //arr[i] = contents[i];

            //if (bc.Count == 1)
            //    bc.Add(null,1);

            if (bc.Count > 0)
            {

                string name = book.Name.Replace(".indb", "." + c + ".pdf");

                Console.WriteLine("Exporting " + name + " to pdf");

                // TODO - fix
                book.Export(idExportFormat.idPDFType, basePath + name, false, preset, bc, miss, false);
            }
        }

    }
}
