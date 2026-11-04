package com.thesarvo.guide.ui

import android.text.format.DateUtils
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.thesarvo.guide.AppModel
import com.thesarvo.guide.Appearance
import com.thesarvo.guide.BuildConfig
import com.thesarvo.guide.DownloadMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavyBar(title: String) {
    TopAppBar(
        title = { Text(title) },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Chrome.bar, titleContentColor = Chrome.light, navigationIconContentColor = Chrome.light, actionIconContentColor = Chrome.light),
    )
}

@Composable
private fun Section(title: String? = null, footer: String? = null, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        if (title != null) Text(title.uppercase(), Modifier.padding(start = 4.dp, bottom = 4.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = RoundedCornerShape(14.dp)) { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { content() } }
        if (footer != null) Text(footer, Modifier.padding(start = 4.dp, top = 4.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun Labeled(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label); Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

@Composable
fun DownloadsScreen(model: AppModel) {
    Column(Modifier.fillMaxSize()) {
        NavyBar("Downloads")
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).widthIn(max = 720.dp)) {
            Section {
                Labeled("Stored on this device", model.fileSize(model.storedBytes))
                Labeled("Guides version", (model.manifest?.contentCommit ?: "seed").take(8))
                val p = model.progress
                if (p != null && p.phase != "Up to date") {
                    Text(if (p.totalFiles > 0) "${p.phase}: ${p.doneFiles} of ${p.totalFiles} files" else p.phase, style = MaterialTheme.typography.bodyMedium)
                    LinearProgressIndicator(progress = { p.doneBytes.toFloat() / maxOf(p.totalBytes, 1L) }, Modifier.fillMaxWidth())
                    if (p.totalBytes > 0) Text("${model.fileSize(p.doneBytes)} of ${model.fileSize(p.totalBytes)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    val (files, bytes) = model.waitingDownloads()
                    if (files > 0) {
                        Labeled("Waiting to download", "$files ${if (files == 1) "file" else "files"}, ${model.fileSize(bytes)}")
                        if (!model.online) Text("Waiting for a connection.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        else if (!model.cellularImages && model.net.isMetered) Text("Waiting for Wi-Fi (mobile data is off for photos).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary); Text("Everything is downloaded", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    model.lastCheck?.let { Labeled("Last checked", DateUtils.getRelativeTimeSpanString(it, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString()) }
                }
                model.syncError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                OutlinedButton(onClick = { model.syncNow() }) { Text("Check for updates") }
            }
            Section("Photos") {
                for (m in DownloadMode.entries) {
                    Row(Modifier.fillMaxWidth().clickable { model.changeMode(m) }, verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = model.mode == m, onClick = { model.changeMode(m) })
                        Text("${m.title} (${model.sizeLabel(m)})")
                    }
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Use mobile data for photos", Modifier.weight(1f))
                    Switch(checked = model.cellularImages, onCheckedChange = { model.setCellular(it) })
                }
            }
            Section {
                TextButton(onClick = { model.deleteDownloadedPhotos() }) { Text("Remove downloaded photos", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@Composable
fun SettingsScreen(model: AppModel) {
    val context = LocalContext.current
    var confirmDelete by remember { mutableStateOf(false) }
    var confirmReset by remember { mutableStateOf(false) }
    val auth = model.auth
    Column(Modifier.fillMaxSize()) {
        NavyBar("Settings")
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).widthIn(max = 720.dp)) {
            Section("Account") {
                val user = auth.user
                if (user != null) {
                    Labeled("Name", user.name.ifEmpty { "–" })
                    Labeled("Email", user.email)
                    if (user.canEdit) Labeled("Access", "Can edit guides")
                    OutlinedButton(onClick = { auth.signOut(context) }) { Text("Sign out") }
                    TextButton(onClick = { confirmDelete = true }) { Text("Delete account", color = MaterialTheme.colorScheme.error) }
                } else {
                    Button(onClick = { auth.signIn(context) }, enabled = !auth.busy) {
                        Text("Sign in"); if (auth.busy) CircularProgressIndicator(Modifier.padding(start = 8.dp).widthIn(max = 18.dp), strokeWidth = 2.dp)
                    }
                    auth.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    Text("Sign in to read members-only guides and to edit. Everything else works without an account.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (model.waitingEdits > 0) Section("Edits", "Made without a connection. They are sent when you are online, for the person who made them.") {
                Text(if (model.waitingEdits == 1) "1 edit is waiting to be sent." else "${model.waitingEdits} edits are waiting to be sent.")
                OutlinedButton(onClick = { model.sendWaitingEdits() }) { Text("Send now") }
            }
            Section("Appearance") {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    Appearance.entries.forEachIndexed { i, a ->
                        SegmentedButton(selected = model.appearance == a, onClick = { model.changeAppearance(a) }, shape = SegmentedButtonDefaults.itemShape(i, Appearance.entries.size)) { Text(a.label) }
                    }
                }
            }
            Section("Reading") {
                Text("Text size")
                Slider(value = model.textScale, onValueChange = { model.changeTextScale(Math.round(it * 20) / 20f) }, valueRange = 0.8f..2f)
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Show climb counts in the menu", Modifier.weight(1f))
                    Switch(checked = model.showClimbsInMenu, onCheckedChange = { model.setShowClimbs(it) })
                }
            }
            Section("About") {
                Labeled("Version", BuildConfig.VERSION_NAME)
                Labeled("Guides", (model.manifest?.contentCommit ?: "").take(8))
                TextButton(onClick = { context.openExternal(android.net.Uri.parse("https://thesarvo.com")) }) { Text("thesarvo.com") }
            }
            Section {
                TextButton(onClick = { confirmReset = true }) { Text("Reset downloaded data", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
    if (confirmDelete) AlertDialog(
        onDismissRequest = { confirmDelete = false },
        text = { Text("Delete your thesarvo account? This cannot be undone.") },
        confirmButton = { TextButton(onClick = { confirmDelete = false; model.deleteAccount(context) }) { Text("Delete account", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
    )
    if (confirmReset) AlertDialog(
        onDismissRequest = { confirmReset = false },
        text = { Text("Remove everything downloaded and go back to the guides that came with the app?") },
        confirmButton = { TextButton(onClick = { confirmReset = false; model.resetStore() }) { Text("Reset", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { confirmReset = false }) { Text("Cancel") } },
    )
}

/** Shown once: how many photos to keep on the phone. The guides themselves (text, topos, maps, small pictures) are already in the app. */
@Composable
fun FirstRun(model: AppModel, requestNotifications: () -> Unit) {
    var choice by remember { mutableStateOf(DownloadMode.AllPhotos) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp).widthIn(max = 560.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Welcome to thesarvo", style = MaterialTheme.typography.headlineLarge, modifier = Modifier.padding(top = 32.dp))
        Text("Every guide is already on this device and works without a signal. Choose how many full-size photos to keep as well. You can change this later in Downloads.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        for (m in DownloadMode.entries) {
            Card(Modifier.fillMaxWidth().clickable { choice = m }, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = RoundedCornerShape(12.dp)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(m.title, style = MaterialTheme.typography.titleMedium); Text(model.sizeLabel(m), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    Icon(if (choice == m) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked, null, tint = if (choice == m) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = RoundedCornerShape(12.dp)) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Use mobile data for photos", style = MaterialTheme.typography.titleMedium); Text(if (model.cellularImages) "Photos download on any connection." else "Photos wait for Wi-Fi.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                Switch(checked = model.cellularImages, onCheckedChange = { model.setCellular(it) })
            }
        }
        Button(onClick = { model.finishFirstRun(choice); requestNotifications() }, Modifier.fillMaxWidth()) { Text("Continue") }
    }
}
