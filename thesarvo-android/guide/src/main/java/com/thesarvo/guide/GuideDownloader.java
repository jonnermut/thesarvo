package com.thesarvo.guide;


import android.content.Context;
import android.util.Log;

import com.google.common.collect.Iterables;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.ls.DOMImplementationLS;
import org.w3c.dom.ls.LSSerializer;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
    private List<Update> queuedDownloads;

    class Update
    {
        public Update(Element element)
        {
            this.element = element;
        }

        Element element;

        public String getUrl()
        {
            return element.getAttribute("url");
        }

        public String getFilename()
        {
            return element.getAttribute("filename");
        }

        public String getLastModified()
        {
            return element.getAttribute("lastModified");
        }

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

        public void addUpdate(Update update)
        {
            Element newOne = this.document.createElement("update");
            newOne.setAttribute("url", update.getUrl());
            newOne.setAttribute("filename", update.getFilename());
            newOne.setAttribute("lastModified", update.getLastModified());
            document.getDocumentElement().appendChild(newOne);

        }
    }

    static String BASE_URL = "http://www.thesarvo.com/confluence";
    static String  SYNC_URL = BASE_URL + "/plugins/servlet/guide/sync/";

    long since = 0;

    File directory = null;

    int completedOps = 0;
    int totalOps = 0;

    Executor queue = Executors.newSingleThreadExecutor();

    //var taskToUpdate = Dictionary<Int, Update>()

    Updates updates = new Updates(null);

    boolean isSyncing()
    {
        return completedOps < totalOps && totalOps > 0;
    }

    public GuideDownloader(File directory, ResourceManager resourceManager)
    {
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

            queue.execute(this::startSync);
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
        return new File(directory, filename).getAbsoluteFile();
    }

    private void startSync()
    {
        if (isSyncing())
        {
            Log.d("GuideDownloader", "Already syncing, not starting again");
            return;
        }

        try
        {
            Long s = this.updates.getMaxLastMod();
            if (s == null)
                s = 0L;

            this.completedOps = 0;
            this.totalOps = 1;

            String surl = SYNC_URL + s.toString();
            URL url = new URL(surl);

            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            InputStream in = new BufferedInputStream(conn.getInputStream());
            Updates newUpdates = new Updates(in);
            processNewUpdates(newUpdates);

            this.queuedDownloads = this.updates.getUpdates();
            this.totalOps += this.queuedDownloads.size();
            queue.execute(this::downloadFirst);
        }
        catch (Throwable t)
        {
            Log.e("GuideDownloader", "Error getting updates list", t);

        }
        completedOps++;
    }

    /**
     * Attempt to download the head of the queue
     */
    private void downloadFirst()
    {
        if (queuedDownloads == null || queuedDownloads.isEmpty())
            return;

        // pop the top of the queue
        Update u = queuedDownloads.get(0);
        queuedDownloads.remove(0);
        File finalPath = getFinalPath(u.getFilename());
        String surl = u.getUrl();


        try
        {
            downloadUrl(surl, finalPath);

            // remove from our list
            u.element.getParentNode().removeChild(u.element);
            updates.save();
        }
        catch (Throwable t)
        {
            Log.e("GuideDownloader", "Error downloading file: " + u.getUrl(), t);
        }
        completedOps++;

        if (queuedDownloads.size() > 0)
        {
            queue.execute(this::downloadFirst);
        }
    }

    private void downloadUrl(String surl, File finalPath) throws IOException
    {
        URL url = new URL(surl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        File tempFile = new File( GuideApplication.get().getCacheDir(), UUID.randomUUID().toString() );

        InputStream in = new BufferedInputStream(conn.getInputStream());
        FileUtils.copyInputStreamToFile(in, tempFile);
        IOUtils.closeQuietly(in);
        conn.disconnect();

        // atomically move into place

        if (finalPath.exists())
            finalPath.delete();
        tempFile.renameTo(finalPath);
    }

    private void processNewUpdates(Updates newUpdates)
    {
        List<Update> existing = new ArrayList<>(this.updates.getUpdates());
        for (Update update : newUpdates.getUpdates())
        {
            String f = update.getFilename();
            if (f != null)
            {
                if (!Iterables.any( existing, u ->  f.equals(u.getFilename()) ))
                {
                    // no match, add it
                    this.updates.addUpdate(update);
                }
            }

        }
        this.updates.save();
    }

}
