package com.thesarvo.guide;


import android.content.Context;
import android.util.Log;

import org.apache.commons.io.FileUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.ls.DOMImplementationLS;
import org.w3c.dom.ls.LSSerializer;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

/**
 * Created by jon on 28/12/2016.
 */

public class GuideDownloader
{
    private final ResourceManager resourceManager;

    class Update
    {
        public Update(Element element)
        {
            this.element = element;
        }

        Element element;

        String url;
        String filename;
        String lastModified;
    }

    class Updates
    {
        Document document;

        Updates(InputStream is)
        {
            if (is != null)
            {
                try
                {
                    document = getDocumentBuilder().parse(is);
                    return;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
            // create default empty
            document = getDocumentBuilder().newDocument();
            document.appendChild( document.createElement("updates") );
        }

        private DocumentBuilder getDocumentBuilder()
        {
            try
            {
                return DocumentBuilderFactory.newInstance().newDocumentBuilder();
            }
            catch (ParserConfigurationException e)
            {
                e.printStackTrace();
            }
            return null;
        }


        Long getMaxLastMod()
        {
            String val = document.getDocumentElement().getAttribute("maxLastMod");
            if (val != null && val.length() > 0)
            {
                return Long.parseLong(val);
            }
            return null;
        }

        void setMaxLastMod(Long lastMod)
        {
            document.getDocumentElement().setAttribute("maxLastMod", lastMod.toString());
        }

        List<Update> getUpdates()
        {
            NodeList nl =  document.getDocumentElement().getElementsByTagName("update");
            List<Update> ret = new ArrayList<>(nl.getLength());

            for (int i=0; i<nl.getLength(); i++)
            {
                Node n = nl.item(i);
                if (n instanceof Element)
                {
                    ret.add( new Update((Element)n) );
                }
            }
            return ret;
        }

        public void save()
        {
            File file = GuideDownloader.this.getUpdatesFilePath();

            try
            {
                Transformer transformer = TransformerFactory.newInstance().newTransformer();
                StreamResult result = new StreamResult(file);
                DOMSource source = new DOMSource(document);
                transformer.transform(source, result);
            }
            catch (Exception e)
            {
                Log.e("GuideDownloader","Unexpected error saving updates.xml", e);
            }
        }
    }

    static String BASE_URL = "http://www.thesarvo.com/confluence";
    static String  SYNC_URL = BASE_URL + "/plugins/servlet/guide/sync/";

    long since = 0;

    File directory = null;
    Context context = null;

    int completedOps = 0;
    int totalOps = 0;

    Executor queue = Executors.newSingleThreadExecutor();

    //var taskToUpdate = Dictionary<Int, Update>()

    Updates updates = new Updates(null);

    boolean isSyncing()
    {
        return completedOps < totalOps && totalOps > 0;
    }

    public GuideDownloader(Context context, File directory, ResourceManager resourceManager)
    {
        this.context = context;
        this.directory = directory;
        this.resourceManager = resourceManager;

        queue.execute( () ->
        {
            // load the existing file

            File updateFile = getUpdatesFilePath();
            if (updateFile.exists())
            {
                try
                {
                    this.updates = new Updates( new FileInputStream(updateFile));
                }
                catch (FileNotFoundException e)
                {
                    e.printStackTrace();
                }
            }

            // check if we have a newer resource updates.xml than our local one
            maybeCopyResourceUpdatesXml();
        });

    }

    private void maybeCopyResourceUpdatesXml()
    {
        InputStream resourceUpdatesXml = resourceManager.getDataAsset("updates.xml");
        if (resourceUpdatesXml != null)
        {
            Updates resourceUpdates = new Updates(resourceUpdatesXml);
            Long lastMod = resourceUpdates.getMaxLastMod();
            if (lastMod != null)
            {
                if (updates.getMaxLastMod() == null || updates.getMaxLastMod() < lastMod)
                {
                    updates.setMaxLastMod(lastMod);
                    updates.save();
                }
            }
        }
    }

    File getUpdatesFilePath()
    {
        return getFinalPath("updates.xml");
    }

    private File getFinalPath(String filename)
    {
        return new File(directory, filename);
    }

}
