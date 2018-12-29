package com.thesarvo.guide

import com.google.android.vending.expansion.downloader.impl.DownloaderService

/**
 * Created by Karl on 11/09/2014.
 */
class AssetsDownloader : DownloaderService() {
    override fun getPublicKey(): String {
        return "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0U4vaTVuyc1GnYGBgsdLNKa8FGAREB9k03J+aYx7v/ODsHetZQcKQ4ZERwe5V1C5Bu3xR6S6lvT7/fRlYHd3WKQko06YTAZ2qaHVP7/JCYsfJQYMrdWIagJoGwA/cOE0fBOSKHb8Kgo0pFAzgvw5VpGN/KD7RV+PgsSK9qgw+P3zeLMfZqYYE3IzucSEBFr2RmWZflg0XDwH2GbsYIZ7xQbhtpDGtkQFrq0X/qj3Sv9m2BKBzCXwxz5v2c2XKfu5KQIbdFviEvO/KDXA7ka7gVToTwSrAPku5Ezl4x0KQD1PqXatawCHVTNW7XSSIDaVgcREBoeHoPzlPep3IG/O3QIDAQAB"
    }

    override fun getSALT(): ByteArray {
        return byteArrayOf(3, -6, 34, 78, -10, 90, 54, 42, -42, 78, -100, 45, 20, -90, 20)
    }

    override fun getAlarmReceiverClassName(): String {
        return AssetAlarmReceiver::class.java.name
    }
}
