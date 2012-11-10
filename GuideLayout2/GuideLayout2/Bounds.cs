using System;
using System.Collections.Generic;
using System.Text;
using InDesign;

namespace GuideLayout
{
    class Bounds
    {
        public double[] raw = new double[4];

        public double top
        {
            get { return raw[0]; }
            set { raw[0]=value; }
        }
        public double bottom
        {
            get { return raw[2]; }
            set { raw[2] = value; }
        }
        public double left
        {
            get { return raw[1]; }
            set { raw[1] = value; }
        }
        public double right
        {
            get { return raw[3]; }
            set { raw[3] = value; }
        }

        public double height
        {
            get { return bottom - top; }
            set { bottom = top + value; }
        }

        public double width
        {
            get { return right - left; }
            set { right = left + value; }
        }

        public Bounds(object obj)
        {
            if (obj is System.Double[])
                raw = (System.Double[]) obj;
            else 
                SetRaw((System.Object[])obj);
        }

        public Bounds()
        {
        }

        //public Bounds(System.Double[] objs)
        //{
        //   SetRaw(objs);
        //}

        public void SetRaw(System.Object[] objs)
        {
            raw = new double[4];
            raw[0] = (double)objs[0];
            raw[1] = (double)objs[1];
            raw[2] = (double)objs[2];
            raw[3] = (double)objs[3];
        }


        public Bounds(double[] raw)
        {
            this.raw = raw;
        }

        public static Bounds GetContentBounds(Document document, Page page)
        {
            // hard coded - eek
            double OUT_MARGIN = 10;
		    double IN_MARGIN = 18;
    		
    		
		    double left = OUT_MARGIN;
		    double right = IN_MARGIN;
    		
            int pageNum = Int32.Parse( page.Name );
		    if (pageNum % 2 == 1)
		    {
			    left = IN_MARGIN;
			    right = OUT_MARGIN;
		    }
    		
		    double myWidth = (double) document.DocumentPreferences.PageWidth;
            double myHeight = (double) document.DocumentPreferences.PageHeight;
    		
		    //var myX1 = myPage.marginPreferences.left;
		    double myX1 = left;

            double myY1 = (double) page.MarginPreferences.Top;
    		
		    //var myX2 = myWidth - myPage.marginPreferences.right;
		    double myX2 = myWidth - right;
            double myY2 = myHeight - (double) page.MarginPreferences.Bottom;
		    
            double[] raw = new double[] { myY1, myX1, myY2, myX2 };
            return new Bounds(raw);
        }

        public Bounds Clone()
        {
            return new Bounds(raw.Clone());
        }
    }
}
