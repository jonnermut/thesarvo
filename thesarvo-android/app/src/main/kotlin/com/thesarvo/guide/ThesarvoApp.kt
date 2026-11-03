package com.thesarvo.guide

import android.app.Application
import com.thesarvo.guide.work.Workers

class ThesarvoApp : Application() {
    val model: AppModel by lazy { AppModel(this) }

    override fun onCreate() { super.onCreate(); Workers.schedule(this) }
}
