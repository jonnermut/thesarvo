package com.thesarvo.guide

import android.app.Application

class ThesarvoApp : Application() {
    val model: AppModel by lazy { AppModel(this) }
}
