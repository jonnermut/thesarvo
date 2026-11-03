package com.thesarvo.guide.sync

import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

object Http {
    /** One client for the whole app (OkHttp pools connections per client). */
    val client: OkHttpClient by lazy {
        OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).callTimeout(0, TimeUnit.SECONDS).followRedirects(true).build()
    }
}

suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
    cont.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) { if (!cont.isCancelled) cont.resumeWithException(e) }
        override fun onResponse(call: Call, response: Response) { if (cont.isCancelled) response.close() else cont.resume(response) }
    })
}
