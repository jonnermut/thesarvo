package com.thesarvo.guide.work

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.work.BackoffPolicy
import androidx.work.CoroutineWorker
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.thesarvo.guide.ThesarvoApp
import java.util.concurrent.TimeUnit

/** Background sync: a periodic refresh, and a foreground service that carries photo downloads on after the app is left. */
object Workers {
    private const val REFRESH = "refresh"
    private const val PHOTOS = "photos"
    const val CHANNEL = "downloads"
    private val connected = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    fun schedule(context: Context) {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(12, TimeUnit.HOURS).setConstraints(connected).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(REFRESH, ExistingPeriodicWorkPolicy.KEEP, req)
    }

    /** A slice of photo downloads (about nine minutes, the limit of a data-sync service); the worker queues the next slice itself. */
    fun startPhotos(context: Context, replace: Boolean = false) {
        val req = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(connected).setInputData(workDataOf("photos" to true)).build()
        WorkManager.getInstance(context).enqueueUniqueWork(PHOTOS, if (replace) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP, req)
    }

    fun stopPhotos(context: Context) { WorkManager.getInstance(context).cancelUniqueWork(PHOTOS) }
}

class SyncWorker(private val context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    private val photos = inputData.getBoolean("photos", false)

    override suspend fun doWork(): Result {
        val model = (context.applicationContext as ThesarvoApp).model
        if (photos) setForeground(info("Downloading guides", 0, 0))
        val deadline = System.currentTimeMillis() + if (photos) 9 * 60_000L else 3 * 60_000L
        var lastShown = 0L
        return try {
            val r = model.backgroundSync(deadline) { p ->
                val now = System.currentTimeMillis()
                if (photos && now - lastShown > 1000) { lastShown = now; notify(p.doneBytes, p.totalBytes) }
            }
            if (r.remaining > 0) Workers.startPhotos(context, replace = true)
            Result.success()
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun notify(done: Long, total: Long) {
        context.getSystemService(NotificationManager::class.java).notify(1, info("Downloading guides", done, total).notification)
    }

    private fun info(title: String, done: Long, total: Long): ForegroundInfo {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(Workers.CHANNEL, "Downloads", NotificationManager.IMPORTANCE_LOW))
        val n = NotificationCompat.Builder(context, Workers.CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(1000, if (total > 0) (done * 1000 / total).toInt() else 0, total <= 0)
            .build()
        return ForegroundInfo(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    override suspend fun getForegroundInfo(): ForegroundInfo = info("Downloading guides", 0, 0)
}
