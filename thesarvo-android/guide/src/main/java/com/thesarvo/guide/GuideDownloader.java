package com.thesarvo.guide;


import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Created by jon on 28/12/2016.
 */

public class GuideDownloader
{
    static class Update
    {
        String url;
        String filename;
        String lastModified;
    }


    static String BASE_URL = "http://www.thesarvo.com/confluence";
    static String  SYNC_URL = BASE_URL + "/plugins/servlet/guide/sync/";

    long since = 0;

    String directory = null;

    int completedOps = 0;
    int totalOps = 0;

    Executor queue = Executors.newSingleThreadExecutor();

    //var taskToUpdate = Dictionary<Int, Update>()

    List<Update> updates = new ArrayList<>();

    boolean isSyncing()
    {
        return completedOps < totalOps && totalOps > 0;
    }

    public GuideDownloader(String directory)
    {
        this.directory = directory;

        // check if we have a newer resource updates.xml than our local one
        maybeCopyResourceUpdatesXml();
    }

    private void maybeCopyResourceUpdatesXml()
    {

    }


}
