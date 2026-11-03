package com.thesarvo.guide.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.thesarvo.core.ContentsFilter
import com.thesarvo.guide.AppModel
import com.thesarvo.guide.ContentsSheet

/** The page's Contents, natively: headings and (optionally) climbs, with a filter; choosing one scrolls the page there. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentsSheetUi(model: AppModel, sheet: ContentsSheet) {
    var query by remember { mutableStateOf("") }
    var showClimbs by remember { mutableStateOf(false) }
    val shown = ContentsFilter.shown(sheet.entries, query, showClimbs)
    ModalBottomSheet(onDismissRequest = { model.contents = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding()) {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Contents", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                if (ContentsFilter.hasBoth(sheet.entries)) FilterChip(selected = showClimbs, onClick = { showClimbs = !showClimbs }, label = { Text("Climbs") })
            }
            OutlinedTextField(value = query, onValueChange = { query = it }, singleLine = true, placeholder = { Text("Filter: name, grade, **") }, modifier = Modifier.fillMaxWidth().padding(16.dp))
            Box(Modifier.fillMaxWidth().widthIn(max = 720.dp)) {
                LazyColumn(Modifier.fillMaxWidth()) {
                    items(shown, key = { it.anchor }) { e ->
                        Row(
                            Modifier.fillMaxWidth().clickable { model.contents = null; model.web.scrollTo(e.anchor) }.padding(start = 16.dp + if (e.level > 0) 14.dp else 0.dp, end = 16.dp, top = 10.dp, bottom = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (e.isClimb && !e.number.isNullOrEmpty()) Text(e.number!!, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(e.text, Modifier.weight(1f), fontWeight = if (e.isClimb) FontWeight.Normal else FontWeight.Medium, color = if (e.isClimb) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.primary)
                            if (e.isClimb) {
                                e.stars?.takeIf { it.isNotEmpty() }?.let { Text("★".repeat(it.length), style = MaterialTheme.typography.bodySmall, color = Color(0xFFFF9500)) }
                                e.grade?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            }
                        }
                    }
                    if (shown.isEmpty()) item { Text("Nothing matches", Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}
