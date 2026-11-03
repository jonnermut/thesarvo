package com.thesarvo.guide.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.thesarvo.core.TreeNode
import com.thesarvo.guide.AppModel

/** The guide menu: one level at a time (a row with a chevron goes down, the top row goes back up), opening at the page you are on. */
@Composable
fun MenuContent(model: AppModel, showDone: Boolean) {
    var query by remember { mutableStateOf("") }
    val tree = model.tree
    val byId = tree?.byId ?: emptyMap()
    val folder = model.menuFolder?.let { byId[it] }
    val rows = folder?.children ?: tree?.roots ?: emptyList()
    val parentFolder = folder?.parent?.let { byId[it] }?.takeIf { it.path.isNotEmpty() }
    val searching = query.isNotBlank()
    val tint = Chrome.periwinkle

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(folder?.title ?: "Guides", style = MaterialTheme.typography.titleLarge, color = Chrome.light, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (showDone) TextButton(onClick = { model.showMenu = false }) { Text("Done", color = Chrome.light) }
        }
        OutlinedTextField(
            value = query, onValueChange = { query = it }, singleLine = true, placeholder = { Text("Search guides", color = Chrome.dim) },
            leadingIcon = { Icon(Icons.Filled.Search, null, tint = Chrome.dim) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { if (searching) { model.openSearch(query); query = "" } }),
            colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Chrome.light, unfocusedTextColor = Chrome.light, focusedBorderColor = tint, unfocusedBorderColor = Chrome.dim, cursorColor = Chrome.light),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        )
        LazyColumn(Modifier.fillMaxSize()) {
            if (searching) {
                item { Row(Modifier.fillMaxWidth().clickable { model.openSearch(query); query = "" }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Search, null, tint = tint); Spacer(Modifier.width(12.dp)); Text("Search all guides for “$query”", color = Chrome.light) } }
                item { SectionHeader("Titles") }
                val q = query.lowercase()
                items(byId.values.filter { it.title.lowercase().contains(q) && it.path.isNotEmpty() }.sortedBy { it.title }.take(60), key = { it.id }) { n ->
                    MenuRow(n, path = n.parent?.let { byId[it] }?.takeIf { it.path.isNotEmpty() }?.title, onClick = { query = ""; model.open(n) })
                }
            } else {
                if (folder != null) {
                    item { Row(Modifier.fillMaxWidth().clickable { model.menuFolder = parentFolder?.id }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = tint); Spacer(Modifier.width(12.dp)); Text(parentFolder?.title ?: "Guides", color = tint) } }
                    item { MenuRow(folder, title = "${folder.title} overview", current = model.selection == folder.id, onClick = { model.open(folder) }) }
                    item { HorizontalDivider(color = Color(1f, 1f, 1f, 0.12f)) }
                } else {
                    item { Row(Modifier.fillMaxWidth().clickable { model.openHome() }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Home, null, tint = Chrome.dim); Spacer(Modifier.width(12.dp)); Text("Home", color = Chrome.light) } }
                    val recent = model.recents.mapNotNull { byId[it] }
                    if (recent.isNotEmpty()) {
                        item { SectionHeader("Recent") }
                        items(recent, key = { "r" + it.id }) { n -> MenuRow(n, current = model.selection == n.id, onClick = { model.open(n) }) }
                    }
                    item { SectionHeader("Guides") }
                }
                items(rows, key = { it.id }) { n ->
                    val isFolder = n.children.isNotEmpty()
                    MenuRow(n, showClimbs = model.showClimbsInMenu, current = model.selection == n.id, chevron = isFolder, onClick = { if (isFolder) model.menuFolder = n.id else model.open(n) })
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(text.uppercase(), Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp), style = MaterialTheme.typography.labelMedium, color = Chrome.dim)
}

@Composable
private fun MenuRow(node: TreeNode, title: String? = null, showClimbs: Boolean = false, path: String? = null, current: Boolean = false, chevron: Boolean = false, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(if (node.isGuide) Icons.Filled.Landscape else Icons.Filled.Description, null, tint = Chrome.dim)
        Column(Modifier.weight(1f)) {
            Text(title ?: node.title, color = if (current) Chrome.periwinkle else Chrome.light, fontWeight = if (current) FontWeight.SemiBold else FontWeight.Normal, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (path != null) Text(path, style = MaterialTheme.typography.bodySmall, color = Chrome.dim)
        }
        if (showClimbs && node.climbs > 0) Text("${node.climbs}", style = MaterialTheme.typography.bodySmall, color = Chrome.dim)
        if (chevron) Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Chrome.dim)
    }
}
