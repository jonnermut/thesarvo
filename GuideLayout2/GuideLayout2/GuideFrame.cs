using System;
using System.Collections.Generic;
using System.Text;
using InDesign;

namespace GuideLayout
{
    public enum FrameType { Heading, Text, Image, Multi, IndentedHeader }

    

    class GuideFrame
    {
        public TextFrame textFrame;
        public Guide guide;
        public GuidePage page;
        public Bounds bounds;

        public Mode mode;
        public FrameType type;
        public string styleClass;

        public double bottomOffset = 1.4;
        
        object miss = System.Reflection.Missing.Value;

        public List<Paragraph> currentParagraphs = null;

        // various pass through props
        public Story story
        {
            get { return textFrame.ParentStory; }
        }

        public InsertionPoint lastInsertionPoint
        {
            get { return (InsertionPoint) textFrame.InsertionPoints.LastItem(); }
        }

        public GuideFrame(TextFrame tf, Guide g, GuidePage p, Mode m, FrameType t)
        {
            this.textFrame = tf;
            this.guide = g;
            this.page = p;
            this.mode = m;
            this.type = t;

            SyncBounds();
        }

        public void ApplyBounds()
        {
            textFrame.GeometricBounds = bounds.raw;
        }

        public void SyncBounds()
        {
            bounds = new Bounds(textFrame.GeometricBounds);
        }

        void Log(string message)
        {
            Console.WriteLine("  - " + message);
        }


        public InsertionPoint AddPara(string str, string style, bool breakIntoParas)
        {
            Story story = textFrame.ParentStory;

            int oldParas = story.Paragraphs.Count;

            str = str.Trim();

            string[] split = new string[] { str };
            if (breakIntoParas)
                split = str.Split('\n');

            InsertionPoint ip = null;
            foreach (string val in split)
            {
                string val2 = val.Trim();

                ip = (InsertionPoint)story.InsertionPoints.LastItem();

                string storyContents = (string)story.Contents;
                if (storyContents.Length > 0)
                    ip.Contents += "\r";

                ip.Contents += val2;
                if (style != null && style.Length > 0)
                {
                    ParagraphStyle styleObj = guide.GetParaStyle(style);

                    if (styleObj == null || ip == null)
                        Log("!! Could not find style=" + style);

                    if (styleObj != null)
                    {
                        //ip.applyParagraphStyle (styleObj, true);
                        //ip.AppliedParagraphStyle = styleObj;
                        ip.ApplyParagraphStyle(styleObj, true);
                        
                        int newParas = story.Paragraphs.Count;

                        //var para;
                        currentParagraphs = new List<Paragraph>();
                        for (int p = oldParas + 1; p <= newParas; p++)
                        {
                            Paragraph para = (Paragraph)story.Paragraphs[p];
                            currentParagraphs.Add(para);
                            //para.applyParagraphStyle (styleObj, true);	
                            //para.AppliedParagraphStyle = styleObj;
                            para.ApplyParagraphStyle(styleObj, true);

                            para.KeepFirstLines = 4;
                            //para.KeepAllLinesTogether = true;
                            
                        }
                    }
                }
            }
            return ip;
        }


        public void ResizeAndPaginate()
        {
            //Bounds bounds = new Bounds(textFrame.GeometricBounds);

            if (textFrame.Paragraphs.Count == 0 && textFrame.AllGraphics.Count == 0)
            {
                bounds.height = 0.001;
                ApplyBounds();
                //textFrame.GeometricBounds = bounds.raw;
                //$.global.textFrames.pop();
            }
            else
            {
                //DoResize(textFrame, bounds);
                ResizeToFit();

                GuidePage pageBefore = this.page;
                if (OverflowsPage())
                {
                    HandlePageOverflow();
                }

                //pageBefore.currentY = bounds.bottom;
            }
        }

        public bool OverflowsPage()
        {
            return bounds.bottom > page.contentBounds.bottom;
        }

        public void ResizeToFit()
        {
            while (textFrame.Overflows)
            {
                bounds.height += 10;
                ApplyBounds();
            }

            while (!textFrame.Overflows && bounds.height > 2)
            {
                bounds.height--;
                ApplyBounds();
            }

            while (textFrame.Overflows)
            {
                bounds.height += 0.2;
                ApplyBounds();
            }

        }

        private void HandlePageOverflow()
        {
            // page overflow
            // decide what to do

            double overlap = bounds.bottom - page.contentBounds.bottom;
            double inlap = page.contentBounds.bottom - bounds.top;
            double percent = (bounds.height - overlap) / bounds.height;

            bool split = false;

            if (overlap < 1)
                return;

            // TODO - last item allow overflow
            // TODO - shrink images that almost fit
            // TODO - move image on to next page, and fill in gap

            if (this.mode == Mode.TwoColumns)
            {
                if (inlap > 15)
                    split = true;
            }
            else
            {
                if (this.type == FrameType.Text && inlap > 15)
                    split = true;
                else
                    split = false;
            }

            MoveFrameToNext( split);
        }

        public bool IsHeading()
        {
            return type == FrameType.Heading;
        }

        public void MoveFrameToNext(bool split)
        {
            GuidePage beforePage = guide.currentPage;

            GuidePage newPage = beforePage;
            bool fits = false;

            while (!fits)
            {
                newPage = guide.GetNextPage(newPage, true);
                fits = split || (newPage.contentBounds.bottom - newPage.GetNextTop() + 1) >= this.bounds.height;

                if (newPage.frames.Count ==0 && this.bounds.height > newPage.contentBounds.height)
                {
                    Log("!! Warning: frame larger than page size");
                    fits = true;
                }
            }            

            if (split)
            {
                SplitFrame(newPage);

            }
            else
            {
                // move whole TF onto next page

                bool backfill = type == FrameType.Image
                                    && mode == Mode.SingleColumn
                                    && page.contentBounds.bottom - bounds.top > 25;

                GuideFrame prev = page.GetPreviousFrame(this);
                GuideFrame prev2 = null;
                if (prev != null && !backfill)
                {
                    prev2 = page.GetPreviousFrame(prev);

                    if (prev.IsHeading() )
                    {
                        if (prev2 != null && prev2.IsHeading())
                        {
                            prev2.MoveToPage(newPage);
                            prev.MoveToPage(newPage);
                            
                        }
                        else
                        {
                            prev.MoveToPage(newPage);

                        }
                        backfill = false;
                    }
                    else if (prev2 != null
                        && prev2.IsHeading()
                        && (page.contentBounds.bottom - prev2.bounds.bottom < 20 || prev.bounds.height < 10 ) )
                    {
                        prev2.MoveToPage(newPage);
                        prev.MoveToPage(newPage);
                        backfill = false;
                    }
                }

                MoveToPage(newPage);

                if (backfill)
                    guide.currentPage = beforePage;
                else
                    guide.currentPage = newPage;

            }
        }

        public GuideFrame SplitFrame(GuidePage newPage)
        {
            GuideFrame newFrame = newPage.CreateTextFrame(this.mode, this.type);

            // thread the current frame to the next, and set it to the end of page
            textFrame.NextTextFrame = newFrame.textFrame;
            bounds.bottom = page.contentBounds.bottom;
            textFrame.GeometricBounds = bounds.raw;

            // size the new frame

            //Bounds newBounds = newFrame.bounds;
            newFrame.ResizeToFit();

            //currentPage.currentY = newBounds.bottom;

            return newFrame;
        }

        public void MoveToPage(GuidePage newPage)
        {
            textFrame.Move(newPage.page, miss);


            TransformBoundsForNewPage(newPage);
            
            this.page.frames.Remove(this);
            this.page = newPage;
            this.page.frames.Add(this);

            //newPage.currentFrame = this;
        }

        public void TransformBoundsForNewPage(GuidePage newPage)
        {
            Bounds oldBounds = bounds.Clone();

            bounds.top = newPage.GetNextTop();
            bounds.height = oldBounds.height;
            bounds.left = (oldBounds.left - page.contentBounds.left) + newPage.contentBounds.left;
            bounds.width = oldBounds.width;

            ApplyBounds();
        }

        public Rectangle GetRect()
        {
            InsertionPoint ip = this.lastInsertionPoint;

            Rectangle rect = ip.Rectangles.Add(miss, idLocationOptions.idAtEnd, miss);

            return rect;
        }

    }
}
