package com.thesarvo.guide.ui

import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.ArrowCircleDown
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.PermanentDrawerSheet
import androidx.compose.material3.PermanentNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.thesarvo.guide.AppModel
import com.thesarvo.guide.AppTab
import com.thesarvo.guide.web.WebModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Root(model: AppModel, requestNotifications: () -> Unit) {
    val context = LocalContext.current
    val wide = LocalConfiguration.current.screenWidthDp >= 840
    LaunchedEffect(model.external) { model.external?.let { context.openExternal(it); model.external = null } }
    LaunchedEffect(model.sharedFile) { model.sharedFile?.let { context.shareFile(it.name, it.mime, it.text); model.sharedFile = null } }

    BackHandler(enabled = model.tab != AppTab.Guides) { model.selectTab(AppTab.Guides) }
    BackHandler(enabled = model.tab == AppTab.Guides && model.web.canGoBack) { model.web.goBack() }
    BackHandler(enabled = model.contents != null) { model.contents = null }
    BackHandler(enabled = model.showMenu && !wide) { model.showMenu = false }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        when {
            model.webUpdateNeeded -> WebViewUpdate()
            !model.firstRunDone && model.manifest != null -> FirstRun(model, requestNotifications)
            else -> Shell(model, wide)
        }
        Notice(model)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Shell(model: AppModel, wide: Boolean) {
    val ime = WindowInsets.isImeVisible
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0),
        bottomBar = {
            if (!ime) NavigationBar(containerColor = Chrome.bar, contentColor = Chrome.light) {
                for (t in AppTab.entries) {
                    val colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Chrome.light, selectedTextColor = Chrome.light, unselectedIconColor = Chrome.dim, unselectedTextColor = Chrome.dim, indicatorColor = Chrome.navy.copy(alpha = 0.9f).let { androidx.compose.ui.graphics.Color(0.25f, 0.25f, 0.6f) },
                    )
                    NavigationBarItem(
                        selected = model.tab == t, onClick = { model.selectTab(t) }, colors = colors,
                        label = { Text(t.name) },
                        icon = {
                            val icon = when (t) { AppTab.Guides -> Icons.AutoMirrored.Filled.MenuBook; AppTab.Map -> Icons.Filled.Map; AppTab.Downloads -> if (model.downloading == null) Icons.Filled.ArrowCircleDown else Icons.Filled.CloudDownload; AppTab.Settings -> Icons.Filled.Settings }
                            if (t == AppTab.Downloads && model.downloading != null) BadgedBox(badge = { Badge { Text(model.downloading ?: "") } }) { Icon(icon, null) } else Icon(icon, null)
                        },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).imePadding()) {
            when (model.tab) {
                AppTab.Guides -> GuidesScreen(model, wide)
                AppTab.Map -> MapScreen(model)
                AppTab.Downloads -> DownloadsScreen(model)
                AppTab.Settings -> SettingsScreen(model)
            }
        }
    }
}

@Composable
private fun GuidesScreen(model: AppModel, wide: Boolean) {
    if (wide) {
        PermanentNavigationDrawer(drawerContent = { PermanentDrawerSheet(Modifier.padding(0.dp), drawerContainerColor = Chrome.menu, drawerContentColor = Chrome.light) { MenuContent(model, showDone = false) } }) { PageScreen(model, showMenuButton = false) }
    } else {
        val drawer = rememberDrawerState(DrawerValue.Closed)
        LaunchedEffect(model.showMenu) { if (model.showMenu) drawer.open() else drawer.close() }
        LaunchedEffect(drawer.currentValue) { if (drawer.currentValue == DrawerValue.Closed && model.showMenu) model.showMenu = false else if (drawer.currentValue == DrawerValue.Open) model.showMenu = true }
        ModalNavigationDrawer(drawerState = drawer, drawerContent = { ModalDrawerSheet(drawerContainerColor = Chrome.menu, drawerContentColor = Chrome.light) { MenuContent(model, showDone = true) } }) { PageScreen(model, showMenuButton = true) }
    }
    model.contents?.let { ContentsSheetUi(model, it) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PageScreen(model: AppModel, showMenuButton: Boolean) {
    val context = LocalContext.current
    var overflow by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Chrome.bar, titleContentColor = Chrome.light, navigationIconContentColor = Chrome.light, actionIconContentColor = Chrome.light),
            title = { Text(model.selection?.let { model.tree?.byId?.get(it)?.title } ?: "thesarvo", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            navigationIcon = {
                Row {
                    if (showMenuButton) IconButton(onClick = { model.openMenu() }) { Icon(Icons.Filled.Menu, "Menu") }
                    if (model.web.canGoBack) IconButton(onClick = { model.web.goBack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                }
            },
            actions = {
                if (model.hasContents) IconButton(onClick = { model.web.requestContents() }) { Icon(Icons.AutoMirrored.Filled.FormatListBulleted, "Contents") }
                Box {
                    IconButton(onClick = { overflow = true }) { Icon(Icons.Filled.MoreVert, "Page options") }
                    DropdownMenu(expanded = overflow, onDismissRequest = { overflow = false }) {
                        DropdownMenuItem(text = { Text("Share") }, leadingIcon = { Icon(Icons.Filled.Share, null) }, onClick = { overflow = false; context.shareText("https://thesarvo.com" + model.web.path) })
                        if (model.canEditPage) DropdownMenuItem(
                            text = { Text(if (model.isEditing) "Stop editing" else "Edit this guide") },
                            leadingIcon = { Icon(if (model.isEditing) Icons.Filled.Visibility else Icons.Filled.Edit, null) },
                            onClick = { overflow = false; model.toggleEdit(context) },
                        )
                    }
                }
            },
        )
        Box(Modifier.fillMaxSize()) {
            WebHost(model.web)
            if (model.manifest == null) EmptyStore(model)
        }
    }
}

/** The one long-lived web view, moved into whichever screen shows the Guides tab. */
@Composable
fun WebHost(web: WebModel, modifier: Modifier = Modifier.fillMaxSize()) {
    key(web.webView) {
        AndroidView(factory = { web.webView.also { (it.parent as? ViewGroup)?.removeView(it) } }, modifier = modifier)
    }
}

@Composable
private fun EmptyStore(model: AppModel) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Filled.CloudDownload, null, Modifier.padding(8.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("No guides on this device yet", style = MaterialTheme.typography.titleMedium)
        Text(if (model.online) "Downloading…" else "Connect to the internet to get them.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        model.syncError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        Button(onClick = { model.syncNow() }) { Text("Try again") }
    }
}

@Composable
private fun WebViewUpdate() {
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Update Android System WebView", style = MaterialTheme.typography.titleLarge)
        Text("thesarvo needs a newer web view than this phone has. Update Android System WebView (or Chrome) in the Play Store, then open the app again.")
        Button(onClick = { context.openExternal(android.net.Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview")) }) { Text("Open the Play Store") }
    }
}

@Composable
private fun Notice(model: AppModel) {
    val n = model.notice
    LaunchedEffect(n) { if (n != null) { delay(3500); if (model.notice == n) model.notice = null } }
    Box(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.systemBars).padding(top = 56.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(visible = n != null) {
            Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.inverseSurface, contentColor = MaterialTheme.colorScheme.inverseOnSurface, shadowElevation = 4.dp) {
                Text(n ?: "", Modifier.padding(horizontal = 16.dp, vertical = 8.dp), style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
