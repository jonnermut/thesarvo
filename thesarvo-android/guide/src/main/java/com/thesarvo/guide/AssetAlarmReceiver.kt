package com.thesarvo.guide

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

import com.google.android.vending.expansion.downloader.DownloaderClientMarshaller

/**
 * Created by Karl on 11/09/2014.
 */
class AssetAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            DownloaderClientMarshaller.startDownloadServiceIfRequired(context, intent, AssetsDownloader::class.java)
        } catch (e: PackageManager.NameNotFoundException) {
            e.printStackTrace()
        }

    }
}
