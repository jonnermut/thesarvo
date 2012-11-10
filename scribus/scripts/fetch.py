#!/usr/bin/env python

# Read a guidebook config file *.gbk
# Provide routines to fetch XML and images, with optional cache check
# Use as command line or included as module in guidebuilder.py

# 0.01 - Original (superstu)
# 0.02 - Support multiple levels of contents (ajfclark)


import xml.dom.minidom
import urllib
import sys
import os.path
import time



class GuidebookParser:

   def __init__(self, filename):
   
      print "Reading " + filename
      f = open(filename, "r")
   
      self.chapters = []
      self.images = {}
      self.site = ""
      self.space = ""
      self.path = ""
      self.aliases = {}
      self.levelsofcontents = 0
      self.numpagesforcontents = 0
      self.includeindexbygrade = False
      self.includeindexbyname = False
      
      for line in f.readlines():
         param = line.split(" ")[0]
         setting = line[len(param)+1:-1]
         
         if param == "site":
            self.site = setting
         elif param == "space":
            self.space = setting
         elif param == "path":
            self.path = setting
         elif param == "guide":
            crag = setting.split(" ")[0]
            region = setting.split(" ")[1].replace("+"," ")
            self.chapters.append((crag,region))    
         elif param == "image":
            src = setting.split(" ")[0].replace("+"," ")
            imgattr = {}
            for imgprop in setting.split(" ")[1:]:
               if "=" in imgprop:
                  prop = imgprop.split("=")[0]
                  val = imgprop.split("=")[1]
                  try:
                     imgattr[prop] = int(val)
                  except ValueError:
                     imtattr[prop] = val
               else:
                  imgattr[imgprop] = "True"
            self.images[src] = imgattr 
         elif param == "alias":
            routename = setting.split(" ")[0].replace("+"," ")
            altname = setting.split(" ")[1].replace("+"," ")
            self.aliases[routename] = altname
         elif param == "contents":
            self.levelsofcontents = int(setting.split(" ")[0])
            self.numpagesforcontents = int(setting.split(" ")[1])
            if self.levelsofcontents < 0:
               print "TOC levels were " + self.levelsofcontents + ". Reset levels of contents to 0"
               self.levelsofcontents = 0
            elif self.levelsofcontents > 3:
               print "TOC levels were " + self.levelsofcontents + ". Reset levels of contents to 3"
               self.levelsofcontents = 3
         elif param == "indexbygrade":
            if setting.split(" ")[0].upper() == "YES":
               self.includeindexbygrade = True
         elif param == "indexbyname":
            if setting.split(" ")[0].upper() == "YES":
               self.includeindexbyname = True
               
      f.close()  
      
      
      if self.site == "":
         sys.stderr.write("Site not specified\n")
         
      if self.space == "":
         sys.stderr.write("Space not specified\n")
         
      if self.path == "":
         sys.stderr.write("Path not specified\n")
         
      if self.chapters == []:
         sys.stderr.write("No guide pages have been included\n")
      
      
   def getXML(self, usecache):
      print "Fetching XML..."
      for (xmlid,region) in self.chapters:
         url = "http://" + self.site + "/plugins/servlet/guide/xml/" + xmlid
         local = self.path + "/" + xmlid + "/" + xmlid + ".xml"
         localdir = self.path + "/" + xmlid
         
         if not os.path.exists(localdir):
            print "Creating directory " + localdir
            os.makedirs(localdir)
         
         if not usecache or not os.path.exists(local):
            self.getFile(url,local)
            
         # Another little servlet returns the grade chart graphics 
         url = "http://" + self.site + "/plugins/servlet/graph?pageId=" + xmlid
         local = self.path + "/" + xmlid + "/graph.pdf"
         
         if not usecache or not os.path.exists(local):
            self.getFile(url,local)


   def getImages(self, usecache):
      print "Fetching images..."
      for (xmlid,region) in self.chapters:
         local = self.path + "/" + xmlid + "/" + xmlid + ".xml"
         print "Parsing " + local
         p = xml.dom.minidom.parse(local)
         for g in p.childNodes:
            if g.nodeName == "guide":
               for i in g.childNodes:
                  if i.nodeType == 1 and i.nodeName == "image":
                     src = i.getAttribute("src")
                     noprint = i.getAttribute("noPrint")
                     if noprint != "true":
                        url = "http://" + self.site + "/plugins/servlet/guide/image/" + xmlid + "/" + src
                        local = self.path + "/" + xmlid + "/" + src
                        if not usecache or not os.path.exists(local):
                           self.getFile(url,local,filetype="b")

   def getFile(self, url, local, filetype=""):
      """The servlet occassionally delivers an empty file
         but with no filesize in the reply no way to verify"""
      print "Fetching " + url
      if os.path.exists(local):
         os.remove(local)
      attempts = 0
      while attempts < 10:
         attempts = attempts + 1
         try:
            (filename, headers) = urllib.urlretrieve(url,local)
         except IOError:
            print "*** Error/no response, pausing and trying again"
            time.sleep(10)
         if os.path.exists(local) and os.path.getsize(local) != 0:
            break
      if os.path.getsize(local) == 0 and url.find("/graph?") == -1:
         print "*** Empty file returned after", attempts, "attempts, giving up"
               
         
if __name__ == "__main__":
   getxml = False
   getimg = False
   usecache = False
   filenames = []

   for arg in sys.argv[1:]:
      if arg == "xml":
         getxml = True
      elif arg == "images":
         getimg = True
      elif arg == "all":
         getxml = True
         getimg = True
      elif arg == "usecache":
         usecache = True
      else:
         if os.path.exists(arg):
            filenames.append(arg)
         else:
            sys.stderr.write("File does not exist: " + arg + "\n")
 
   if filenames == [] or (not getxml and not getimg):   
      print "usage: python fetch.py <guide.gbk> xml|images|all [usecache]"
      sys.exit()

   for filename in filenames:
      gp = GuidebookParser(filename)

      if getxml: gp.getXML(usecache)
      if getimg: gp.getImages(usecache)
        
     
       
       


