#!/usr/bin/env python
# -*- coding: cp1252 -*-

#  Run this script from within Scribus to build a guidebook.
#
#  You will need an empty document template open, with the necessary styles set.
#  

SCRIPT_VERSION = "0.17 Thursday 15 March 2012 (superstu)"

# 0.13 - include index in table of contents

# 0.14 - optional route name aliases in config file for index
#      - include routes with "The X" in index again under "X, The"
 
# 0.15 - sidebar tweak 
#      - fix bug with single column guides spanning pages
#      - config control over contents level (ajfclark)
#      - unicode processing of climb name alias (ajfclark)

# 0.16 - revised column handling (superstu)
#      - fix bug with progress bar (superstu)
#      - flush images immediately to avoid single column pages (superstu)

# 0.17 - support maxwidth parameter for images




import xml.dom.minidom
import scribus
import urllib
import Tkinter
import fetch
import os
import sys

if sys.platform == "win32":
   #Scribus on Win32 uses its own Python installation, can't seem to find mine, so use this kludge
   x = sys.path
   x.append("C:\\Users\\auryanda2\\Desktop\\Stu Dobbie\\python2.7.2\\Lib\\site-packages")
   x.append("C:\\Users\\auryanda2\\Desktop\\Stu Dobbie\\python2.7.2\\Lib")
   x.append("C:\\Users\\auryanda2\\Desktop\\Stu Dobbie\\python2.7.2\\libs")
   
   x.append("C:\\python27\\Lib\\site-packages")
   x.append("C:\\python27\\Lib")
   x.append("C:\\python27\\libs")
   
   sys.path = x
   from PIL import Image
   #curses.ascii not avail for win32
   TAB = 9
else:
   import Image   
   from curses.ascii import *


HEADERSIZE = 40
GRAPHSIZE = 40
ICONSIZE = 10
COLUMNGAP = 5
FRAMEGAP = 5
MINFRAMESIZE = 10
TITLESIZE = 15
ROUNDS = 1
NOSPLIT_LIMIT = 500
GLYPH_STAR = u"\u2605" 
GLYPH_RIGHTPOINTER = u"\u25BA"
MIN_DPI = 144


DOCFILE = "/home/speedie/Documents/climbing/Guidebooks/thesarvo/trunk/scribus/config/test.gbk"
#DOCFILE = "C:\\Users\\auryanda2\\Dropbox\\Guidebooks\\sydney.gbk"


               

def insertTextWithStyle(txt,style,frame):
   start = scribus.getTextLength(frame)
   scribus.insertText(txt, -1, frame)
   scribus.selectText(start, len(txt), frame)
   try:
      scribus.setStyle(style, frame)
   except scribus.NotFoundError:
      scribus.createParagraphStyle(style)
      scribus.setStyle(style, frame)
   scribus.insertText("\n", -1, frame)


def getCurrentPageMargins():
   """This is a fix for the Scribus 'feature' with getPageMargins()
      Scribus seems to return document margins, not page margins for current page"""
   (top, left, right, bottom) = scribus.getPageMargins()
   if scribus.currentPage() % 2 == 1:  # odd page
      return (top,left,right,bottom)
   else:
      return (top,right,left,bottom)


def getImageSizeRatio(imgsrc):
   """Calculate height to width ratio for an image"""
   im = Image.open(imgsrc)
   (width,height) = im.size
   return float(height) / float(width)
   
   
class TableOfContents():
   """Progressively add chapter names then draw table of contents at the end"""

   def __init__(self,page):
      scribus.newPage(-1)
      self.contentspage = scribus.currentPage()
      for i in range(1,page):
         scribus.newPage(-1)
      self.sections = []
      
   def add(self, label, level, page):
      self.sections.append((label,level,page))
      
   def draw(self, tolevel):
      contents = []
      for (label,level,page) in self.sections:
         if level <= tolevel:
            text = label + chr(TAB) + str(page)
            style = "Contents" + str(level)
            contents.append((text,style))
      
      page = self.contentspage
      scribus.gotoPage(page)
      (width,height) = scribus.getPageSize()
      (top,left,right,bottom) = getCurrentPageMargins()
      frame = scribus.createText(left, top, width-right-left, TITLESIZE)
      insertTextWithStyle("Contents","Title",frame)
      
      frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
      scribus.setColumns(2,frame)
      scribus.setColumnGap(COLUMNGAP,frame)
      for (text,style) in contents:
         insertTextWithStyle(text,style,frame)
         if scribus.textOverflows(frame):
            oldframe = frame
            page = page + 1
            scribus.gotoPage(page)
            (top,left,right,bottom) = getCurrentPageMargins()
            frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
            scribus.setColumns(2,frame)
            scribus.setColumnGap(COLUMNGAP,frame)
            scribus.linkTextFrames(oldframe,frame)



class ClimbIndex():
   """Progressively build an index of climb names"""
   
   def __init__(self):
      self.climbs = []
      
   def add(self, routename, grade, stars, crag, page):
      if len(routename) < 3:
         routename = routename + " (" + crag[:20] + ")"
      grade = grade.strip("+").strip()
      if len(grade) > 3 and grade[-2:] == "M1":
         grade = grade[:-2]
      self.climbs.append( (routename, grade, stars, crag, page) )
   
   
   def drawIndexByName(self):
      contents = {}
      climbnames = []
      for (route, grade, stars, crag, page) in self.climbs:
         text = route + chr(TAB) + str(page)
         contents[route] = (text,"Index")
         climbnames.append(route)
      climbnames.sort() 
      
      (width,height) = scribus.getPageSize()
      (top,left,right,bottom) = getCurrentPageMargins()
      frame = scribus.createText(left, top, width-right-left, TITLESIZE)
      insertTextWithStyle("Index by Route Name","Title",frame)
      
      frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
      scribus.setColumns(2,frame)
      scribus.setColumnGap(COLUMNGAP,frame)
      for route in climbnames:
         (text,style) = contents[route]
         insertTextWithStyle(text,style,frame)
         if scribus.textOverflows(frame):
            oldframe = frame
            scribus.newPage(-1)
            (top,left,right,bottom) = getCurrentPageMargins()
            frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
            scribus.setColumns(2,frame)
            scribus.setColumnGap(COLUMNGAP,frame)
            scribus.linkTextFrames(oldframe,frame)
      
      
   
   def drawIndexByGrade(self):
      grades = []
      climbsatgrade = {}
      for (route, gradestr, stars, crag, page) in self.climbs:
         grade = (" " + gradestr.replace("?","")).center(3," ")
         if grade != "   " and route[-5:] != ", The":
            if not grade in grades: grades.append(grade)
            routename = route + " " + stars
            if not grade in climbsatgrade: 
               climbsatgrade[grade] = [(routename,page)]
            else:
               climbsatgrade[grade] = climbsatgrade[grade] + [(routename,page)]
      grades.sort() 
      
      (width,height) = scribus.getPageSize()
      (top,left,right,bottom) = getCurrentPageMargins()
      frame = scribus.createText(left, top, width-right-left, TITLESIZE)
      insertTextWithStyle("Index by Grade","Title",frame)
      
      frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
      scribus.setColumns(2,frame)
      scribus.setColumnGap(COLUMNGAP,frame)
      for grade in grades:
         insertTextWithStyle("Grade " + grade,"IndexGrade",frame)
      
         for climb in climbsatgrade[grade]:
            (route,page) = climb
            text = route + chr(TAB) + str(page)
            insertTextWithStyle(text,"Index",frame)
         if scribus.textOverflows(frame):
            oldframe = frame
            scribus.newPage(-1)
            (top,left,right,bottom) = getCurrentPageMargins()
            frame = scribus.createText(left, top+TITLESIZE, width-right-left, height-top-bottom-TITLESIZE)
            scribus.setColumns(2,frame)
            scribus.setColumnGap(COLUMNGAP,frame)
            scribus.linkTextFrames(oldframe,frame)
      
      
   def drawIndexByStars(self):
      pass
         

class SideBar():
   """That little rectangle on the left or right of a page with the current chapter name"""

   def __init__(self):
      self.txt = ""
      self.y = 10
      self.height = 0
      self.frames = []
      
   def setText(self,txt):
      if self.txt != txt:
         self.y = self.y + 10
         (pagewidth,pageheight) = scribus.getPageSize()
         self.txt = txt
         self.height = len(self.txt) * 2 + 10
         if self.y + self.height > pageheight:
            self.y = 10
         
   def draw(self):
      if self.txt != "":
         if scribus.currentPage() % 2 == 0:   
            r = scribus.createRect(-1,self.y,8,self.height)
            t = scribus.createText(2,self.y + self.height,self.height,6)
         else:   
            (pagewidth, pageheight) = scribus.getPageSize()
            r = scribus.createRect(pagewidth-7,self.y,8,self.height)
            t = scribus.createText(pagewidth-5,self.y + self.height,self.height,6)
         scribus.setFillColor("Black",r)
         scribus.setFillShade(20,r)
         scribus.setLineColor("None",r)
         scribus.setCornerRadius(ROUNDS,r)
         scribus.insertText(self.txt, -1, t)
         scribus.deselectAll()
         scribus.selectObject(t)
         scribus.selectText(0, len(self.txt), t)
         scribus.setStyle("Sidebar", t)
         scribus.rotateObject(90,t)
         self.frames.append(r)
         self.frames.append(t)
            
      

class FrameHandler():
   """The business."""

   def __init__(self):
      (self.pagewidth, self.pageheight) = scribus.getPageSize()
      (self.topmargin, self.leftmargin, self.rightmargin, self.bottommargin) = getCurrentPageMargins()
      self.frame = None
      self.textframes = []
      self.imageframes = []
      self.sidebar = SideBar()
      self.imagebuffer = []
      self.columns = 1


   def newPage(self):
      scribus.newPage(-1)
      (self.topmargin, self.leftmargin, self.rightmargin, self.bottommargin) = getCurrentPageMargins()
      self.columnwidth = (self.pagewidth - self.leftmargin - self.rightmargin - COLUMNGAP) / 2
      self.sidebar.draw()
      self.frame = None


   def gotoPage(self,page):
      scribus.gotoPage(page)
      (self.topmargin, self.leftmargin, self.rightmargin, self.bottommargin) = getCurrentPageMargins()
      self.columnwidth = (self.pagewidth - self.leftmargin - self.rightmargin - COLUMNGAP) / 2
      
   
   def newFrame(self, height=MINFRAMESIZE, columns=2):
      """Start a new text frame.
         If we are working with 2 columns, we build each column as a seperate frame.
         Scribus does support multi column text frames, but with no keep-with-next
         functionality its of no use."""

      self.flushImages()
      if columns == 2 and self.frame != None and self.currentcolumn == 1:
         # Start the second column.
         (x,y) = scribus.getPosition(self.frame)
         (w,h) = scribus.getSize(self.frame)
         width = w
         xpos = x + w + COLUMNGAP
         ypos = y
         self.currentcolumn = 2
      else:
         # First column or full width frame
         while True:
            ypos = self.topmargin
            for obj in scribus.getAllObjects():
               if obj in self.textframes:
                  (x,y) = scribus.getPosition(obj)
                  (w,h) = scribus.getSize(obj)
                  if y + h > ypos: 
                     ypos = y + h + FRAMEGAP
            if ypos + height > self.pageheight - self.bottommargin:
               self.newPage()
               self.flushImages()
            else:
               break
         xpos = self.leftmargin
         if columns == 1: 
            width = self.pagewidth - self.leftmargin - self.rightmargin
            self.currentcolumn = 0
         else:            
            width = self.columnwidth
            self.currentcolumn = 1
                                
      self.frame = scribus.createText(xpos, ypos, width, height)
      self.contents = []
      self.buffer = []
      self.columns = columns
      self.framelinked = False
      self.textframes.append(self.frame)
      

   def styleText(self, content, style, frame):
      c2 = content.replace("<BR/>","\n").replace("<br/>","\n").replace("<br>","\n").replace("<BR>","\n").strip()
      for txt in c2.split("\n"):
         t2 = txt.strip()
         if len(t2) > 0:
            insertTextWithStyle(t2, style, frame)
            
            
   def setColumns(self, columns):
      self.columns = columns
            
         

   def placeText(self, content, style, columns=None, keepwithnext=False, nosplit=False):
      if columns == None: 
         columns = self.columns
      
      if self.frame == None or columns != self.columns:
         self.newFrame(columns=columns)
         
      self.styleText(content,style, self.frame)
      
      self.buffer.append((content,style))
      
      # nosplit ensures current block (any preceding blocks with keepwithnext) are carried to any new frame
      if not nosplit:
         self.contents = self.contents + self.buffer 
         self.buffer = []
         
      self.expandFrame()  
      
      # keepwithnext ensures this block carries with next block
      if not keepwithnext:
         self.contents = self.contents + self.buffer
         self.buffer = []


   def expandFrame(self):
      """Text is inserted into a frame without regard to frame size.
         Later we expand the frame to fit the text, carrying text to
         a new frame if necessary."""
      numcarries = 0
      self.raiseImages()
      if self.frame != None:
         while scribus.textOverflows(self.frame,) > 0:
            (x,y) = scribus.getPosition(self.frame)
            (width,height) = scribus.getSize(self.frame)
            if y + height < self.pageheight - self.bottommargin:
               scribus.sizeObject(width, height + 1, self.frame)
            else:
               fullpage = (y <= self.topmargin and self.columns == 1)
               if self.buffer != [] and not self.framelinked and numcarries < 4 and not fullpage:
                  numcarries = numcarries + 1
                  scribus.deselectAll()
                  scribus.deleteText(self.frame)
                  for (content,style) in self.contents:
                     self.styleText(content,style,self.frame)
                  newcontents = self.buffer[:]
                  self.newFrame(columns=self.columns)
                  for (content,style) in newcontents:
                     self.styleText(content,style,self.frame)
                  self.buffer = newcontents[:]
               else:
                  lastframe = self.frame
                  self.newFrame(columns=self.columns)
                  scribus.linkTextFrames(lastframe,self.frame)
                  self.framelinked = True
            self.raiseImages()
               
            
   def endFrame(self):
      self.expandFrame()
      self.flushImages()
      self.frame = None


   def endGuide(self):
      #self.endFrame()
      while self.imagebuffer != []:
         self.newPage()
         self.flushImages()
         
      
   def placeImage(self, src, imgattr):
      if "fullpage" in imgattr:
      
         # we may need to flip these 180 depending on left or right page
      
         page = scribus.currentPage()
         cframe = self.frame
         self.newPage()
         imgwidth = imgattr["width"]
         imgheight = imgattr["height"]
         ratio = float(imgheight) / float(imgwidth)
                  
         xpos = self.leftmargin         
         if imgheight > imgwidth:
            width = self.pagewidth - self.leftmargin - self.rightmargin
            height = width * ratio
            if height > self.pageheight - self.topmargin - self.bottommargin:
               height = self.pageheight - self.topmargin - self.bottommargin
               xpos = xpos + (width - (height / ratio)) / 2
               width = height / ratio
            self.pasteImage(src, xpos, self.topmargin, width, height, rotate=False)
            if "title" in imgattr:
               self.pasteCaption(xpos, self.topmargin, imgattr["title"], width)
            if "footer" in imgattr:
               self.pasteCaption(xpos, self.topmargin+height-COLUMNGAP, imgattr["footer"], width) 
         else:
            width = self.pageheight - self.topmargin - self.bottommargin
            height = width * ratio
            self.pasteImage(src, xpos, self.pageheight - self.bottommargin, width, height, rotate=True)
         self.gotoPage(page)
         self.frame = cframe
      else:
         self.imagebuffer.append( (src,imgattr) )
         #if self.frame == None:
         # always flush images here
         self.flushImages()


   def clashes(self, xpos, ypos, width, height, obj):
      (x,y) = scribus.getPosition(obj)
      (w,h) = scribus.getSize(obj)
      return not ((x+w < xpos or x > xpos+width) or (y+h < ypos or y > ypos+height))
      

   def gotSpace(self, xpos, ypos, width, height):
      for obj in scribus.getAllObjects():
         if not obj in self.sidebar.frames:
            if self.clashes(xpos, ypos, width, height, obj):
               return False
      return True
      
      
   def freeSpace(self, width, height):
      ypos = self.topmargin
      for obj in scribus.getAllObjects():
         if not obj in self.sidebar.frames:
            (x,y) = scribus.getPosition(obj)
            (w,h) = scribus.getSize(obj)
            if y + h > ypos:
               ypos = y + h + COLUMNGAP + 1
      if ypos + height <= self.pageheight - self.bottommargin and self.gotSpace(self.leftmargin, ypos, width, height):
         return ypos
      else:
         return -1
      

   def flushImages(self):
      while self.imagebuffer != []:
         (src,imgattr) = self.imagebuffer[0]
         width = imgattr["width"]
         height = imgattr["height"]
         ratio = float(height) / float(width)
         
         # max size to meet minimum DPI
         maxwidth = width / MIN_DPI * scribus.mm/scribus.inch
         maxheight = height / MIN_DPI * scribus.mm/scribus.inch
         
         if "maxwidth" in imgattr:
            maxwidth = imgattr["maxwidth"]
            
         if width >= height or self.columns == 1:
            # this one will be laid horizontally
            fullwidth = self.pagewidth - self.leftmargin - self.rightmargin
            
            width = min(fullwidth,maxwidth)
            #width = fullwidth
            
            height = width * ratio
                        
            xpos = self.leftmargin
            if self.columns == 1:
               ypos = self.freeSpace(width, height + COLUMNGAP)
               if ypos == -1:
                  break
               #push to bottom if close to it
               if ypos + height > self.pageheight - self.bottommargin - COLUMNGAP * 3:
                  ypos = self.pageheight - self.bottommargin - height   
            else:
               if self.gotSpace(self.leftmargin, self.topmargin, fullwidth, height):
                  # this one will fit across the top of the page
                  xpos = self.leftmargin
                  ypos = self.topmargin
               elif self.gotSpace(self.leftmargin, self.pageheight - self.bottommargin - height, fullwidth, height):
                  # this one will fit across the bottom of the page
                  xpos = self.leftmargin
                  ypos = self.pageheight - self.bottommargin - height
               else:
                  # this one will need to go across the next page
                  break
         else:
            # this one will be laid vertically in a column
            fullwidth = self.columnwidth
            
            width = min(self.columnwidth,maxwidth)
            
            
            height = width * ratio
            if self.gotSpace(self.leftmargin, self.topmargin, fullwidth, height):
               # this one will go top left corner
               xpos = self.leftmargin
               ypos = self.topmargin
            elif self.gotSpace(self.leftmargin + self.columnwidth + COLUMNGAP, self.topmargin, fullwidth, height):
               # this one will go top right corner
               xpos = self.leftmargin + self.columnwidth + COLUMNGAP
               ypos = self.topmargin
            elif self.gotSpace(self.leftmargin, self.pageheight - self.bottommargin - height, fullwidth, height):
               # this one will go bottom left corner
               xpos = self.leftmargin
               ypos = self.pageheight - self.bottommargin - height
            elif self.gotSpace(self.leftmargin + self.columnwidth + COLUMNGAP, self.pageheight - self.bottommargin - height, fullwidth, height):
               # this one will go bottom right corner
               xpos = self.leftmargin + self.columnwidth + COLUMNGAP
               ypos = self.pageheight - self.bottommargin - height
            else:
               # this one will need to go on a new page
               # wait until next time...
               break
         self.pasteSpacer(xpos-COLUMNGAP, ypos-COLUMNGAP, fullwidth+COLUMNGAP*2, height+COLUMNGAP*2)
         if fullwidth == width: offset = 0
         else: offset = (fullwidth - width) / 2
         self.pasteImage(src,xpos + offset,ypos,width,height)
         if "title" in imgattr:
            self.pasteCaption(xpos + offset, ypos, imgattr["title"], width)
         if "footer" in imgattr:
            self.pasteCaption(xpos + offset, ypos, imgattr["footer"], width, imgheight=height, footer=True) 
         self.imagebuffer = self.imagebuffer[1:]


   def pasteImage(self, src, xpos, ypos, width, height, rotate=False):
      img = scribus.createImage(xpos, ypos, width, height)
      scribus.loadImage(src, img)
      scribus.setScaleImageToFrame(True,True,img)    
      scribus.textFlowMode(img, 1)
      if src[-3:] == "jpg":
         scribus.setLineColor("Black",img)
         scribus.setLineWidth(0.2,img)
      #scribus.setLineShade(50,img)
      if rotate:
         scribus.rotateObject(90,img)
      #scribus.setCornerRadius(ROUNDS,img)
      self.imageframes.append(img)
      


   def pasteSpacer(self, xpos, ypos, width, height):
      img = scribus.createRect(xpos, ypos, width, height)
      scribus.textFlowMode(img,1)
      scribus.setLineColor("None",img)
      scribus.setFillColor("None",img)
      self.imageframes.append(img)
      

   def pasteCaption(self, xpos, ypos, text, width, imgheight=0, footer=False):
      height = 5 
      rect = scribus.createRect(xpos, ypos, width, height)
      scribus.setFillColor("Black",rect)
      scribus.setFillTransparency(0.60,rect)
      scribus.setCornerRadius(ROUNDS,rect)
      scribus.setLineColor("White",rect)
      scribus.setLineWidth(0.4,rect)
      frame = scribus.createText(xpos+2, ypos+1, width, height)
      self.styleText(text, "imageCaption", frame)
      scribus.setTextColor("White",frame)
      scribus.setFillColor("None",frame)
      # there are probably some performance issues in the following section of code
      if scribus.textOverflows(frame) == 0:
         # its a one liner, so shrink width
         while scribus.textOverflows(frame) == 0 and width > 5:
            width = width - 1
            scribus.sizeObject(width, height, frame)
         scribus.sizeObject(width+2, height, frame)
         scribus.sizeObject(width+4, height, rect)
      else:
         # its a multi liner, expand vertically
         while scribus.textOverflows(frame) > 0:
            height = height + 1
            scribus.sizeObject(width, height, frame)
         scribus.sizeObject(width, height+1, rect)
      if footer:
         scribus.moveObject(0,imgheight - height - 1,rect)
         scribus.moveObject(0,imgheight - height - 1,frame)
      self.imageframes.append(rect)
      self.imageframes.append(frame)
      
      
   def raiseFrames(self, framelist):
      scribus.deselectAll()
      for i in scribus.getAllObjects():
         if i in framelist:
            scribus.selectObject(i)      
      scribus.moveSelectionToFront()
      

   def raiseImages(self):
      self.raiseFrames(self.imageframes)
      self.raiseFrames(self.sidebar.frames)

      
   def placeGuide(self, rock, sun, walk, graph, iconpath):
      """Build the header section of a guide"""
      if self.frame != None:
         (w,h) = scribus.getSize(self.frame)
         scribus.sizeObject(w, h + HEADERSIZE, self.frame)
            
         if os.path.exists(graph):
            img = scribus.createImage(self.leftmargin + 5, self.topmargin + 10, GRAPHSIZE, GRAPHSIZE)
            scribus.loadImage(graph, img)
            scribus.setScaleImageToFrame(True,True,img)    
                     
         offset = 13
         iconleft = self.leftmargin + 10 + GRAPHSIZE + 3
         txtleft = iconleft + ICONSIZE + 3
         framewidth = self.pagewidth - self.leftmargin - self.rightmargin
         if sun != "":
            img = scribus.createImage(iconleft, self.topmargin + offset, ICONSIZE, ICONSIZE)
            scribus.loadImage(iconpath + os.sep + "sun1.png", img)
            scribus.setScaleImageToFrame(True,True,img)
            #scribus.setCornerRadius(ROUNDS,img)
            icontxtframe = scribus.createText(txtleft, self.topmargin + offset + 2, framewidth - txtleft, ICONSIZE)
            self.styleText(sun, "IconText", icontxtframe)
            offset = offset + ICONSIZE + 3
               
         if walk != "":
            img = scribus.createImage(iconleft, self.topmargin + offset, ICONSIZE, ICONSIZE)
            scribus.loadImage(iconpath + os.sep + "walk1.png", img)
            scribus.setScaleImageToFrame(True,True,img)    
            #scribus.setCornerRadius(ROUNDS,img)
            icontxtframe = scribus.createText(txtleft, self.topmargin + offset + 2, framewidth - txtleft, ICONSIZE)
            self.styleText(walk, "IconText", icontxtframe)
            offset = offset + ICONSIZE + 3
                  
         if rock != "":
            img = scribus.createImage(iconleft, self.topmargin + offset, ICONSIZE, ICONSIZE)
            scribus.loadImage(iconpath + os.sep + "rock1.png", img)
            scribus.setScaleImageToFrame(True,True,img)    
            #scribus.setCornerRadius(ROUNDS,img)
            icontxtframe = scribus.createText(txtleft, self.topmargin + offset + 2, framewidth - txtleft, ICONSIZE)
            self.styleText(rock, "IconText", icontxtframe)
            offset = offset + ICONSIZE + 3
      self.endFrame()
 
 
def create_guide(gp):
   fh = FrameHandler()
   toc = TableOfContents(gp.numpagesforcontents)
   index = ClimbIndex()

   scribus.statusMessage("Creating document...")
   nchapters = len(gp.chapters)
   scribus.progressTotal(nchapters)
   scribus.progressReset()
   progress = 0
   
   currentregion = ""
   crag = ""
   
   
   for (xmlid,region) in gp.chapters:
      scribus.statusMessage("Parsing " + xmlid + "...")
      progress = progress + 1
      scribus.progressTotal(nchapters)
      scribus.progressSet(progress)
  
      p = xml.dom.minidom.parse(gp.path + os.sep + xmlid + os.sep + xmlid + ".xml")
               
      for g in p.getElementsByTagName("guide"):
         
         for n in g.childNodes:

            if n.nodeName == "header":
         
               intro = n.getAttribute("intro")
               name = n.getAttribute("name")
               rock = n.getAttribute("rock")
               sun = n.getAttribute("sun")
               access = n.getAttribute("access")
               acknow = n.getAttribute("acknowledgement")
               walk = n.getAttribute("walk")
               camping = n.getAttribute("camping")
               history = n.getAttribute("history")
               stars = g.getAttribute("guidestars").replace("*",GLYPH_STAR)
            
               scribus.statusMessage("Parsing " + xmlid + " (" + name + ")...")
               scribus.progressTotal(nchapters)
               scribus.progressSet(progress)
               
               fh.endFrame()
               #fh.sidebar.setText("")
               fh.sidebar.setText(name)
               fh.newPage()
               fh.setColumns(1)
               #if scribus.currentPage() % 2 != 0:
               #   fh.newPage()
            
               fh.placeText(name, "Title", columns=1, keepwithnext=True, nosplit=True)
               if region != currentregion:
                  toc.add(region, 1, scribus.currentPage())
                  currentregion = region
               toc.add(name + " " + stars,2,scribus.currentPage())
               crag = name
               #fh.sidebar.setText(crag)
                  
               graphpath = gp.path + os.sep + xmlid + os.sep + "graph.pdf"
               fh.placeGuide(rock, sun, walk, graphpath, iconpath=gp.path)
               
               if len(acknow) > 0:
                  fh.placeText("Contributors", "IntroTitle", nosplit=True, keepwithnext=True)
                  fh.placeText(acknow, "Intro", nosplit=True)
            
               if len(intro) > 0:
                  fh.placeText("General Rave", "IntroTitle", nosplit=True, keepwithnext=True)
                  fh.placeText(intro, "Intro")
                     
               if len(history) > 0:
                  fh.placeText("History", "IntroTitle", nosplit=True, keepwithnext=True)
                  fh.placeText(history, "Intro")
                     
               if len(access) > 0:
                  fh.placeText("Access", "IntroTitle", nosplit=True, keepwithnext=True)
                  fh.placeText(access, "Intro")
                     
               if len(camping) > 0:
                  fh.placeText("Camping", "IntroTitle", nosplit=True, keepwithnext=True)
                  fh.placeText(camping, "Intro")
            
               fh.endFrame()  
               
               fh.setColumns(2)        
            
  
            elif n.nodeName == "climb" or n.nodeName == "problem":

               
               extra = n.getAttribute("extra")
               grade = n.getAttribute("grade")
               length = n.getAttribute("length")
               name = n.getAttribute("name")
               fa = n.getAttribute("fa")
               stars = n.getAttribute("stars").replace("*",GLYPH_STAR)
               number = n.getAttribute("number")

               scribus.statusMessage("Parsing " + xmlid + " (" + crag + ") " + name)
               scribus.progressTotal(nchapters)
               scribus.progressSet(progress)
               
               # OK for now, but we will want to break this up later
               routename = stars + "  " + name + "  " + length + "  " + grade + "  " + extra
               if number != "": routename = "(" + number + ")  " + routename

               #routename = chr(TAB) + stars + chr(TAB) + name + chr(TAB) + length + chr(TAB) + grade + chr(TAB) + extra
               #if number != "":
               #   routename = "(" + number + ")" + routename
            
               fh.placeText(routename, "Route Name", columns=2, nosplit=True, keepwithnext=True)
            
               for t in n.childNodes:
                  if t.nodeType == 3:
                     txt = t.nodeValue
                     #fh.placeText(t.nodeValue, "Route Description", columns=2, nosplit=True, keepwithnext=(len(fa)>0))        
                     fh.placeText(txt, "Route Description", columns=2, nosplit=(len(txt)<NOSPLIT_LIMIT), keepwithnext=(len(fa)>0))        
            
               if len(fa) > 0:
                  fh.placeText(fa, "FA Details", columns=2, nosplit=True)
            
               if n.nodeName == "climb":
                  index.add(name, grade, stars, crag, scribus.currentPage())
                  if name[:3] == "The":
                     index.add(name[4:] + ", The", grade, stars, crag, scribus.currentPage())
                  #if name in gp.aliases:
                  #   index.add(gp.aliases[name].decode("utf-8"), grade, stars, crag, scribus.currentPage())
                  #   print "Alias Match (via key): " + name + " matches " + route + " substitute " + alternatename
                  for (route, alternatename) in gp.aliases.iteritems():
                     if name == route:
                  #     print "Alias Match(via unrolled niceness): " + name + " matches " + route + " substitute " + alternatename
                        index.add(alternatename.decode("utf-8"), grade, stars, crag, scribus.currentPage())




            elif n.nodeName == "text":
         
               # class can be one of...
               #    text, heading1, heading2, heading3, intro, indentedHeader
               #    Editor, Discussion, DiscussionNoIndents, noPrint
               # assign Style to class name & control layout from Scribus Style Editor 
       
               clss = n.getAttribute("class")
               if clss == "": clss = "text"

               for t in n.childNodes:
                  if t.nodeType == 3:
                     txt = t.nodeValue
                  
                     if clss == "indentedHeader":
                        firstline = txt.split("\n")[0]
                        rest = txt[len(firstline)+1:]
                        if firstline[-1] == ":":
                           fh.placeText(firstline[:-1], "heading3", nosplit=True, keepwithnext=True)
                           fh.placeText(rest, "Intro")
                        else:
                           fh.placeText(txt, "Intro")
                     
                     elif clss == "heading3":
                        fh.placeText(GLYPH_RIGHTPOINTER + " " + txt, clss, nosplit=True, keepwithnext=True)
                        #if txt != currentregion:
                        toc.add(txt,4,scribus.currentPage())
                     
                     elif clss == "heading2":
                        #fh.endFrame()
                        fh.placeText(txt, clss, columns=2, nosplit=True, keepwithnext=True)
                        #if txt != currentregion:
                        toc.add(txt,3,scribus.currentPage())
                     
                     elif clss == "heading1":
                        fh.endFrame()
                        fh.sidebar.setText("")
                        #fh.sidebar.setText(txt)
                        fh.newPage()
                        fh.placeText(txt, "Title", columns=1, nosplit=True, keepwithnext=True)
                        if region != currentregion:
                           toc.add(region, 1, scribus.currentPage())
                           currentregion = region
                        toc.add(txt,2,scribus.currentPage())
             
                     elif clss == "intro":
                        fh.placeText(txt, "Intro", nosplit=True, keepwithnext=True)
                        
                     elif clss == "text":
                        fh.placeText(txt, clss, columns=2, nosplit=True, keepwithnext=True)
                        #fh.placeText(txt, clss, nosplit=True, keepwithnext=False)
                     
                     
            elif n.nodeName == "image":
               src = n.getAttribute("src")
               legend = n.getAttribute("legend")
               legendtitle = n.getAttribute("legendTitle")
               legendfooter = n.getAttribute("legendFooter")
               noprint = n.getAttribute("noPrint")

               scribus.statusMessage("Parsing " + xmlid + " (" + crag + ") image=" + src)
               scribus.progressTotal(nchapters)
               scribus.progressSet(progress)
                
               if src in gp.images:
                  attr = gp.images[src]
               else:
                  attr = {}
               
               if noprint != "true":
                  fullsrc = gp.path + os.sep + xmlid + os.sep + src
                  if not os.path.exists(fullsrc):
                     scribus.messageBox('Bummer, dude', 'Image file missing: ' + fullsrc, icon=scribus.ICON_WARNING)
                  else:
                     try:
                        i = Image.open(fullsrc)
                        (width,height) = i.size
                        attr["width"] = width
                        attr["height"] = height
                        if legend == "true":
                           if len(legendtitle.strip()) > 0:
                              attr["title"] = legendtitle
                           if len(legendfooter.strip()) > 0:
                              attr["footer"] = legendfooter
                        fh.placeImage(fullsrc, attr)
                     except IOError:
                        scribus.messageBox("Bummer, dude", "Image file corrupt: " + fullsrc)
                     
      fh.expandFrame()
      fh.endGuide()

      
   if gp.includeindexbyname:
      scribus.statusMessage("Creating index by name...")
      scribus.progressReset()
      scribus.newPage(-1)
      if scribus.currentPage() % 2 == 0:    # even page
         scribus.newPage(-1)
      page = scribus.currentPage()
      index.drawIndexByName()
      toc.add("Index by Route Name",1,page)
   if gp.includeindexbygrade:
      scribus.statusMessage("Creating index by grade...")
      scribus.progressReset()
      scribus.newPage(-1)
      page = scribus.currentPage()
      index.drawIndexByGrade()
      toc.add("Index by Grade",1,page)
   if gp.levelsofcontents > 0:
      scribus.statusMessage("Creating table of contents...")
      scribus.progressReset()
      toc.draw(gp.levelsofcontents)



def main():
   docfile = scribus.fileDialog("Find Guidebook Config File", "*.gbk", DOCFILE, haspreview=True, issave=False, isdir=False)
   if len(docfile) != 0:
      if not os.path.exists(docfile):
         scribus.messageBox("Bwaahaha","File does not exist")
      else:
         create_guide(fetch.GuidebookParser(docfile))
   
   
def main_wrapper():
   """The main_wrapper() function disables redrawing, sets a sensible generic
   status bar message, and optionally sets up the progress bar. It then runs
   the main() function. Once everything finishes it cleans up after the main()
   function, making sure everything is sane before the script terminates."""
   scribus.messageBox("Version",SCRIPT_VERSION)
   if not scribus.haveDoc():
      scribus.messageBox("Bwaaaahaha","Need a base document open")
   else:
      scribus.setRedraw(False)
      try:
          scribus.statusMessage("Running script...")
          scribus.progressReset()
          main()
      finally:
          # Exit neatly even if the script terminated with an exception,
          # so we leave the progress bar and status bar blank and make sure
          # drawing is enabled.
          if scribus.haveDoc():
              scribus.setRedraw(True)
              scribus.docChanged(True)
          scribus.statusMessage("")
          scribus.progressReset()
          

# This code detects if the script is being run as a script, or imported as a module.
# It only runs main() if being run as a script. This permits you to import the script
# from the python interpreter and control it manually for debugging.
if __name__ == '__main__':
   main_wrapper()



