package com.thesarvo.guide.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.thesarvo.core.AuthException
import com.thesarvo.core.AuthUser
import com.thesarvo.core.Pkce
import com.thesarvo.core.Tokens
import com.thesarvo.guide.Prefs
import com.thesarvo.guide.sync.Http
import com.thesarvo.guide.sync.await
import java.io.File
import java.io.IOException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.FormBody
import okhttp3.Request

/**
 * Cognito sign-in with PKCE in a Custom Tab, with the mobile app client (callback `thesarvo://auth/callback`, handled by
 * `AuthRedirectActivity`). The verifier and state are kept across a process death while the browser is open. Tokens live in the vault.
 */
class AuthSession(private val prefs: Prefs, filesDir: File) {
    private val vault = TokenVault(filesDir)
    private val json = Json { ignoreUnknownKeys = true }
    private val refreshLock = Mutex()

    var user: AuthUser? by mutableStateOf(null); private set
    var error: String? by mutableStateOf(null)
    var busy: Boolean by mutableStateOf(false); private set
    var tokens: Tokens? = null; private set

    /** Called whenever tokens change (page script) and on sign-out (private store). */
    var onChange: ((Tokens?) -> Unit)? = null

    val clientId get() = prefs.clientId ?: Pkce.MOBILE_CLIENT_ID

    init {
        vault.read()?.let { raw -> runCatching { json.decodeFromString(Tokens.serializer(), raw.decodeToString()) }.getOrNull() }?.let { t ->
            tokens = t
            user = Pkce.user(t.idToken)
        }
    }

    /** Debug builds only: a fake token drives the UI (nothing is stored). */
    fun useDebugToken(idToken: String) {
        tokens = Tokens(idToken, null, "", System.currentTimeMillis() + 3_600_000.0)
        user = Pkce.user(idToken)
    }

    private fun store(t: Tokens?) {
        tokens = t
        user = t?.let { Pkce.user(it.idToken) }
        if (t != null) vault.write(json.encodeToString(Tokens.serializer(), t).toByteArray()) else vault.delete()
        onChange?.invoke(t)
    }

    /** Takes tokens the page refreshed for itself (it refreshes with the same refresh token), keeping the vault current. */
    fun adopt(t: Tokens) {
        val cur = tokens
        if (t == cur || t.idToken.isEmpty() || t.expiresAt < (cur?.expiresAt ?: 0.0)) return
        store(if (t.refreshToken.isEmpty()) t.copy(refreshToken = cur?.refreshToken ?: "") else t)
    }

    /** Forgets the tokens and ends the Cognito login in the browser, so the next sign-in can be another person (or account). */
    fun signOut(context: Context) {
        store(null)
        launch(context, Pkce.logoutUrl(Pkce.DOMAIN, clientId, Pkce.SIGNED_OUT))
    }

    /** Opens the Cognito sign-in page; the answer arrives in [handleCallback]. */
    fun signIn(context: Context) {
        error = null
        val verifier = Pkce.verifier()
        val state = Pkce.verifier()
        prefs.sp.edit().putString("pkce.verifier", verifier).putString("pkce.state", state).apply()
        launch(context, Pkce.authorizeUrl(Pkce.DOMAIN, clientId, Pkce.REDIRECT, state, Pkce.challenge(verifier)))
    }

    private fun launch(context: Context, url: String) {
        try {
            CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, Uri.parse(url))
        } catch (e: Exception) {
            error = "No web browser is available to sign in."
        }
    }

    /** The redirect `thesarvo://auth/callback?...`: exchanges the code for tokens. A link that is not ours (no pending sign-in) is ignored. */
    suspend fun handleCallback(uri: Uri) {
        if (uri.path?.trimEnd('/') != "/callback") return
        val verifier = prefs.sp.getString("pkce.verifier", null)
        val state = prefs.sp.getString("pkce.state", null)
        if (verifier == null || state == null) return
        prefs.sp.edit().remove("pkce.verifier").remove("pkce.state").apply()
        busy = true
        try {
            val code = Pkce.code(uri.toString(), state)
            val r = token(mapOf("grant_type" to "authorization_code", "code" to code, "code_verifier" to verifier, "redirect_uri" to Pkce.REDIRECT))
            store(Tokens(r.idToken, r.accessToken, r.refreshToken ?: "", System.currentTimeMillis() + r.expiresIn * 1000))
        } catch (e: AuthException) {
            error = e.message
        } catch (e: IOException) {
            error = "Could not reach the sign-in service. Check your connection and try again."
        } finally {
            busy = false
        }
    }

    /** A current ID token, refreshed when within two minutes of expiry; null when signed out or the refresh was refused. */
    suspend fun freshTokens(): Tokens? = refreshLock.withLock {
        val t = tokens ?: return null
        if (t.expiresAt - 120_000 > System.currentTimeMillis() || t.refreshToken.isEmpty()) return t
        try {
            val r = token(mapOf("grant_type" to "refresh_token", "refresh_token" to t.refreshToken))
            val next = t.copy(idToken = r.idToken, accessToken = r.accessToken, expiresAt = System.currentTimeMillis() + r.expiresIn * 1000)
            store(next)
            next
        } catch (e: AuthException) {
            if (e.refused) { store(null); null } else t // the refresh token expired or was revoked
        } catch (e: IOException) {
            t // offline: keep what we have
        }
    }

    private class TokenReply(val idToken: String, val accessToken: String, val refreshToken: String?, val expiresIn: Double)

    private suspend fun token(params: Map<String, String>): TokenReply {
        val form = FormBody.Builder().apply { (params + ("client_id" to clientId)).forEach { (k, v) -> add(k, v) } }.build()
        val req = Request.Builder().url("${Pkce.DOMAIN}/oauth2/token").post(form).build()
        Http.client.newCall(req).await().use { resp ->
            if (resp.code == 400 || resp.code == 401) throw AuthException("Sign-in was refused.", refused = true)
            if (resp.code != 200) throw AuthException("Sign-in failed (${resp.code})")
            val o: JsonObject = json.parseToJsonElement(resp.body.string()).jsonObject
            return TokenReply(o.getValue("id_token").jsonPrimitive.content, o.getValue("access_token").jsonPrimitive.content, o["refresh_token"]?.jsonPrimitive?.content, o.getValue("expires_in").jsonPrimitive.double)
        }
    }
}
