package com.thesarvo.core

import java.net.URLEncoder
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class Tokens(val idToken: String, val accessToken: String? = null, val refreshToken: String, /** milliseconds since 1970, as the website keeps it */ val expiresAt: Double)

/** What the page and the Account screen know about the signed-in person. */
data class AuthUser(val email: String, val name: String, val groups: List<String>) {
    val canEdit get() = "admins" in groups || "editors" in groups
}

class AuthException(message: String, val refused: Boolean = false) : Exception(message)

/** Pure sign-in helpers, kept apart so they can be unit tested. */
object Pkce {
    const val DOMAIN = "https://auth.thesarvo.com"
    const val REDIRECT = "thesarvo://auth/callback"
    const val SIGNED_OUT = "thesarvo://auth/signout"
    /** The Cognito mobile client id (public, no secret), shared with the iOS app. */
    const val MOBILE_CLIENT_ID = "7b9l6bgg8aln7jo1s877d49q8i"

    private val random = SecureRandom()

    fun base64url(data: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(data)

    fun verifier(): String = base64url(ByteArray(32).also { random.nextBytes(it) })

    fun challenge(verifier: String): String = base64url(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray()))

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8").replace("+", "%20")

    private fun query(items: List<Pair<String, String>>) = items.joinToString("&") { "${enc(it.first)}=${enc(it.second)}" }

    /** Cognito's logout page, which clears its cookie and returns to `redirect` (a logout URL registered on the client). */
    fun logoutUrl(domain: String, clientId: String, redirect: String): String =
        "$domain/logout?" + query(listOf("client_id" to clientId, "logout_uri" to redirect))

    fun authorizeUrl(domain: String, clientId: String, redirect: String, state: String, challenge: String): String =
        "$domain/oauth2/authorize?" + query(
            listOf(
                "client_id" to clientId,
                "response_type" to "code",
                "scope" to "openid email profile aws.cognito.signin.user.admin",
                "redirect_uri" to redirect,
                "state" to state,
                "code_challenge" to challenge,
                "code_challenge_method" to "S256",
            ),
        )

    private fun queryItems(url: String): List<Pair<String, String>> {
        val q = url.substringAfter('?', "").substringBefore('#')
        if (q.isEmpty()) return emptyList()
        return q.split('&').filter { it.isNotEmpty() }.map {
            val kv = it.split('=', limit = 2)
            java.net.URLDecoder.decode(kv[0], "UTF-8") to java.net.URLDecoder.decode(kv.getOrElse(1) { "" }, "UTF-8")
        }
    }

    /** The authorization code in the callback URL, or the reason there is none (an error from Cognito, or a state that is not ours). */
    fun code(callback: String, state: String): String {
        val items = queryItems(callback)
        items.firstOrNull { it.first == "error" }?.let { e -> throw AuthException(items.firstOrNull { it.first == "error_description" }?.second ?: e.second) }
        val code = items.firstOrNull { it.first == "code" }?.second
        if (code == null || items.firstOrNull { it.first == "state" }?.second != state) throw AuthException("This sign-in link has expired. Please try again.")
        return code
    }

    /** The claims of a JWT, unverified (the server verifies; this only shows who is signed in). */
    fun claims(jwt: String): JsonObject? {
        val parts = jwt.split('.')
        if (parts.size < 2) return null
        return try {
            Json.parseToJsonElement(String(Base64.getUrlDecoder().decode(parts[1]))).jsonObject
        } catch (e: Exception) {
            null
        }
    }

    fun user(idToken: String): AuthUser? {
        val c = claims(idToken) ?: return null
        val groups = (c["cognito:groups"] as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
        return AuthUser(c["email"]?.jsonPrimitive?.contentOrNull ?: "", c["name"]?.jsonPrimitive?.contentOrNull ?: "", groups)
    }
}
