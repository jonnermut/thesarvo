package com.thesarvo.guide.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities

/** Whether there is a network and whether it is metered (mobile data), as the system sees it now. */
class NetworkState(context: Context) {
    private val cm = context.getSystemService(ConnectivityManager::class.java)

    val isOnline: Boolean get() = cm.getNetworkCapabilities(cm.activeNetwork)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
    val isMetered: Boolean get() = cm.isActiveNetworkMetered

    /** Calls [onChange] with the online state whenever it changes; returns a function that stops it. */
    fun watch(onChange: (Boolean) -> Unit): () -> Unit {
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) { onChange(caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) }
            override fun onLost(network: Network) { onChange(isOnline) }
        }
        cm.registerDefaultNetworkCallback(cb)
        onChange(isOnline)
        return { runCatching { cm.unregisterNetworkCallback(cb) } }
    }
}
