package com.thesarvo.guide.ui

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import com.thesarvo.core.ClusterEngine
import com.thesarvo.core.CragPoint
import com.thesarvo.core.DirectionsTarget
import com.thesarvo.core.KmlParser
import com.thesarvo.core.MapItem
import com.thesarvo.guide.AppModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val Tasmania = LatLng(-42.1, 146.6)

private fun mapTypeOf(i: Int) = when (i) { 0 -> MapType.NORMAL; 1 -> MapType.SATELLITE; else -> MapType.HYBRID }

/** The crags map: Google Maps with our own grid clustering (named for the area the crags share), a callout, and a choice of directions apps. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(model: AppModel) {
    val context = LocalContext.current
    var all by remember { mutableStateOf<List<CragPoint>>(emptyList()) }
    var styleIndex by remember { mutableStateOf(model.prefs.sp.getInt("mapType", 2)) }
    var selected by remember { mutableStateOf<CragPoint?>(null) }
    var directionsFor by remember { mutableStateOf<CragPoint?>(null) }
    var typeMenu by remember { mutableStateOf(false) }
    val previous = remember { mutableStateListOf<LatLngBounds>() }
    val camera = rememberCameraPositionState { position = CameraPosition.fromLatLngZoom(Tasmania, 6.2f) }
    var located by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { located = it.values.any { ok -> ok } }
    LaunchedEffect(Unit) { if (!located && !model.noLocationPrompt) ask.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) }

    LaunchedEffect(model.manifest?.builtAt, model.indexVersion) {
        val stamp = model.manifest?.builtAt
        if (all.isNotEmpty() && stamp == null) return@LaunchedEffect
        val items = model.kmlPaths().mapNotNull { p -> model.readData(p)?.let { p.substringAfterLast('/').removeSuffix(".kml") to it } }
        all = withContext(Dispatchers.Default) {
            val parsed = items.flatMap { (id, d) -> KmlParser.parse(d, id) }
            KmlParser.dedupe(parsed) { model.areaNames(it).size }
        }
    }
    val shown = remember(all, model.pagePoints) {
        val g = model.pagePoints.firstOrNull()?.guideId
        if (g == null) all else all.filter { it.guideId != g } + model.pagePoints
    }
    val focus = model.mapFocus?.takeIf { model.tree?.byId?.get(it)?.isGuide == true }?.takeIf { f -> shown.isEmpty() || shown.any { it.guideId == f } }
    val focusTitle = focus?.let { model.tree?.byId?.get(it)?.title } ?: "Map"

    // Fit the focused guide's points (at least about 100 m across), or the whole of Tasmania.
    LaunchedEffect(focus, shown.count { it.guideId == focus }) {
        previous.clear(); selected = null
        val mine = if (focus == null) emptyList() else shown.filter { it.guideId == focus }
        if (mine.isNotEmpty()) {
            val b = LatLngBounds.Builder().also { bb -> mine.forEach { bb.include(LatLng(it.latitude, it.longitude)) } }.build()
            val c = b.center
            val pad = 0.0005
            val fit = LatLngBounds.Builder().include(b.southwest).include(b.northeast).include(LatLng(c.latitude - pad, c.longitude - pad)).include(LatLng(c.latitude + pad, c.longitude + pad)).build()
            runCatching { camera.animate(CameraUpdateFactory.newLatLngBounds(fit, 120)) }
        } else if (shown.size > 1) runCatching { camera.animate(CameraUpdateFactory.newLatLngZoom(Tasmania, 6.2f)) }
    }

    val latSpan = camera.projection?.visibleRegion?.latLngBounds?.let { it.northeast.latitude - it.southwest.latitude } ?: 5.2
    val settled = !camera.isMoving
    val items = remember(shown, if (settled) latSpan else -1.0) {
        ClusterEngine.build(shown, latSpan, { p -> chainOf(model, p) })
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(focusTitle) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Chrome.bar, titleContentColor = Chrome.light, actionIconContentColor = Chrome.light),
            navigationIcon = {
                Box {
                    TextButton(onClick = { typeMenu = true }) { Text(listOf("Standard", "Satellite", "Hybrid")[styleIndex], color = Chrome.light) }
                    DropdownMenu(expanded = typeMenu, onDismissRequest = { typeMenu = false }) {
                        listOf("Standard", "Satellite", "Hybrid").forEachIndexed { i, n -> DropdownMenuItem(text = { Text(n) }, onClick = { styleIndex = i; model.prefs.sp.edit().putInt("mapType", i).apply(); typeMenu = false }) }
                    }
                }
            },
            actions = { if (focus != null) TextButton(onClick = { model.mapFocus = null }) { Text("All crags", color = Chrome.light) } },
        )
        Box(Modifier.fillMaxSize()) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(), cameraPositionState = camera,
                properties = MapProperties(mapType = mapTypeOf(styleIndex), isMyLocationEnabled = located),
                uiSettings = MapUiSettings(compassEnabled = true, myLocationButtonEnabled = located, zoomControlsEnabled = false, mapToolbarEnabled = false),
                onMapClick = { selected = null },
            ) {
                for (item in items) when (item) {
                    is MapItem.Single -> Marker(
                        state = rememberMarkerState(key = item.point.id, position = LatLng(item.point.latitude, item.point.longitude)),
                        title = item.point.title, snippet = item.point.detail, icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                        onClick = { selected = item.point; true },
                    )
                    is MapItem.Cluster -> Marker(
                        state = rememberMarkerState(key = "c${item.latitude},${item.longitude},${item.points.size}", position = LatLng(item.latitude, item.longitude)),
                        title = item.title, icon = clusterIcon(item.points.size), anchor = androidx.compose.ui.geometry.Offset(0.5f, 0.5f),
                        onClick = {
                            selected = null
                            camera.projection?.visibleRegion?.latLngBounds?.let { previous.add(it) }
                            val b = LatLngBounds.Builder().also { bb -> item.points.forEach { bb.include(LatLng(it.latitude, it.longitude)) } }.build()
                            runCatching { model.zoomTo(camera, b) }
                            true
                        },
                    )
                }
            }
            if (previous.isNotEmpty()) FilledIconButton(onClick = { val b = previous.removeAt(previous.lastIndex); runCatching { model.zoomTo(camera, b, 0) } }, Modifier.align(Alignment.TopStart).padding(12.dp)) { Icon(Icons.AutoMirrored.Filled.Undo, "Back to the previous view") }
            selected?.let { p ->
                Card(Modifier.align(Alignment.BottomCenter).padding(12.dp).fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(p.title, style = MaterialTheme.typography.titleMedium)
                        Text(p.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { selected = null; model.openGuide(p.guideId, p.subtitle) }) { Text("Open guide") }
                            OutlinedButton(onClick = { directionsFor = p }) { Text("Directions") }
                        }
                    }
                }
            }
        }
    }
    directionsFor?.let { p ->
        AlertDialog(
            onDismissRequest = { directionsFor = null }, title = { Text("Directions to ${p.title}") },
            text = { Column { for (t in DirectionsTarget.all(p.latitude, p.longitude, p.title)) TextButton(onClick = { directionsFor = null; context.openExternal(Uri.parse(t.url)) }) { Text(t.name) } } },
            confirmButton = { TextButton(onClick = { directionsFor = null }) { Text("Cancel") } },
        )
    }
}

/** A point's areas, then the KML folder it sits in when that is a place of its own (a region's file has folders for each crag). */
private fun chainOf(model: AppModel, p: CragPoint): List<String> {
    val areas = model.areaNames(p.guideId)
    return if (p.subtitle.isEmpty() || p.subtitle == areas.lastOrNull()) areas else areas + p.subtitle
}

private val icons = HashMap<Int, BitmapDescriptor>()

private fun clusterIcon(count: Int): BitmapDescriptor = icons.getOrPut(count) {
    val size = 96
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = 0xFFFFFFFF.toInt(); c.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.color = 0xFF1B1464.toInt(); c.drawCircle(size / 2f, size / 2f, size / 2f - 6, paint)
    paint.color = 0xFFFFFFFF.toInt(); paint.textAlign = Paint.Align.CENTER; paint.textSize = if (count > 99) 30f else 38f; paint.isFakeBoldText = true
    c.drawText(count.toString(), size / 2f, size / 2f + paint.textSize / 3, paint)
    BitmapDescriptorFactory.fromBitmap(bmp)
}
