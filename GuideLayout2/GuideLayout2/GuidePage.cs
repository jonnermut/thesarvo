using System;
using System.Collections.Generic;
using System.Text;
using InDesign;

namespace GuideLayout
{

    class GuidePage
    {
        public Guide guide;
        public Page page;
        public int idx = -1;

        public Bounds pageBounds;
        public Bounds contentBounds;

        public double nextTopMin = 0;

        //public double currentY
        //{
        //    get { return currentFrame == null ? contentBounds.top : currentFrame.bounds.bottom; }
        //}

        public List<GuideFrame> frames = new List<GuideFrame>();
        
        //public GuideFrame currentFrame = null;

        public GuideFrame currentFrame
        {
            get { return frames.Count == 0 ? null : frames[frames.Count-1]; }
        }

        //public Mode currentMode = Mode.SingleColumn;

        public Mode currentMode
        {
            get { return currentFrame == null ? Mode.SingleColumn : currentFrame.mode; }
        }

        object miss = System.Reflection.Missing.Value;
        
        public GuidePage( Guide g, Page p, int ind)
        {
            this.guide = g;
            this.page = p;
            this.idx = ind;
            
            pageBounds = new Bounds( page.Bounds);
            contentBounds = Bounds.GetContentBounds(g.document, page);
            
            //currentY = contentBounds.top;
        }

        public double GetNextTop()
        {
            if (frames.Count == 0)
                return contentBounds.top;
            else
                return Math.Max( currentFrame.bounds.bottom + currentFrame.bottomOffset , nextTopMin );
        }

        public GuideFrame CreateTextFrame(Mode mode, FrameType type )
        {
  
            Bounds newBounds = contentBounds.Clone();
            newBounds.top = GetNextTop();
            newBounds.height = 10;
            

            TextFrame textFrame = page.TextFrames.Add(miss, idLocationOptions.idAtEnd, miss);
			textFrame.GeometricBounds = newBounds.raw;
			textFrame.TextFramePreferences.FirstBaselineOffset = idFirstBaseline.idLeadingOffset;
			
            if (mode==Mode.TwoColumns)
            {
                textFrame.TextFramePreferences.TextColumnCount = 2;
            }
				
			//$.global.textFrames.push( myTextFrame );

            GuideFrame frame = new GuideFrame(textFrame, this.guide, this, mode, type);
            frame.bounds = newBounds;

            //currentFrame = frame;
            frames.Add(frame);

            //currentMode = mode;

            return frame;
        }

        public GuideFrame GetPreviousFrame(GuideFrame frame)
        {
            if (!frames.Contains(frame))
                return null;

            int idx = frames.IndexOf(frame);

            if (idx > 0)
                return frames[idx - 1];
            else
                return null;
        }

        public void ApplyMaster(string name)
        {
            MasterSpread master = guide.GetMaster(name);
            if (master!=null)
                page.AppliedMaster = guide.GetMaster(name);
        }
    }
}
