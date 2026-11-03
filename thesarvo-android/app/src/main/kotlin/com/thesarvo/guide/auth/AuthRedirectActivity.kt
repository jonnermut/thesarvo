package com.thesarvo.guide.auth

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.thesarvo.guide.MainActivity
import com.thesarvo.guide.ThesarvoApp

/** Receives `thesarvo://auth/callback` and `thesarvo://auth/signout` from the Custom Tab, then returns to the app (which closes the tab). */
class AuthRedirectActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handle(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    private fun handle(intent: Intent) {
        val uri = intent.data
        if (uri != null) (application as ThesarvoApp).model.onAuthRedirect(uri)
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
        finish()
    }
}
