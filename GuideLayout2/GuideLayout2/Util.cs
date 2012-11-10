using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using InDesign;

namespace GuideLayout
{
    class Util
    {

        public static string GetNextNodeName(XmlElement node)
        {
            XmlNode ne = node.NextSibling;
            while ( !(ne==null || ne is XmlElement) )
                ne = ne.NextSibling;

            if (ne == null)
                return null;

            else
                return ne.Name;
        }

        public static bool IsHeading(string style)
        {
            if (style == null)
                return false;

            return style.StartsWith("heading");
        }

        public static Bounds GetImageBounds(object obj)
        {
            if (obj is Image)
                return new Bounds(((Image)obj).GeometricBounds);
            if (obj is PDF)
                return new Bounds(((PDF)obj).GeometricBounds);

            throw new Exception("Unknown image type");
        }



        /*
        public static string GetInDesignMysteryType(object o)
        {
            // Create dynamic compiler with reference to InDesign.Dll
            CSharpCodeProvider c = new Microsoft.CSharp.CSharpCodeProvider();
            ICodeCompiler cc = c.CreateCompiler();
            CompilerParameters cp = new CompilerParameters(new string[] { "Interop.InDesign.dll" });

            // start building the source string for compiler
            string src = @"using System;
				using InDesign;
				public class InDesignType {
					public static string Get (object o) {";

            // Get all possible types from the Indesign dll using reflection
            Assembly a = Assembly.LoadFrom("Interop.InDesign.dll");
            Type[] types = a.GetTypes();


            foreach (Type type in types)
            {
                src += string.Format("if (o is {0}) return \"{0}\";\r\n", type.FullName);
            }

            src += @"else return ""Unknown"";
			}}";

            CompilerResults cr = cc.CompileAssemblyFromSource(cp, src);

            string thisType = null;

            if (cr.Errors.Count == 0)
            {
                Assembly ass = cr.CompiledAssembly;

                Type indesignType = ass.GetType("InDesignType");
                object id = Activator.CreateInstance(indesignType);
                MethodInfo mi = indesignType.GetMethod("Get");
                thisType = (string)mi.Invoke(id, new Object[] { o });

            }

            return thisType;
        }	
        */

    }



}
