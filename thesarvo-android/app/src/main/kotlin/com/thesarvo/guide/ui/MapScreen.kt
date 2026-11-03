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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.json.JSONArray
import org.json.JSONObject
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point
import com.thesarvo.core.ClusterEngine
import com.thesarvo.core.CragPoint
import com.thesarvo.core.DirectionsTarget
import com.thesarvo.core.KmlParser
import com.thesarvo.core.MapItem
import com.thesarvo.guide.AppModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val Tasmania = LatLng(-42.1, 146.6)

/** One raster basemap: its tile URL, deepest native zoom and credit. The same set as the web map (Esri imagery, theLIST's Tasmanian layers, OpenStreetMap); none needs a key. */
private class Basemap(val name: String, val url: String, val maxZoom: Int, val attribution: String)

private fun list(name: String, service: String, maxZoom: Int, licence: String) =
    Basemap(name, "https://services.thelist.tas.gov.au/arcgis/rest/services/Basemaps/$service/MapServer/tile/{z}/{y}/{x}", maxZoom, "© State of Tasmania, theLIST ($licence)")

private val basemaps = listOf(
    Basemap("Satellite", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 18, "© Esri, Maxar, Earthstar Geographics"),
    list("LIST aerial", "Orthophoto", 19, "CC BY-NC-ND 3.0 AU"),
    list("LIST topographic", "Topographic", 18, "CC BY 3.0 AU"),
    list("Tasmap 1:25k", "TasmapRaster", 16, "CC BY-NC-ND 3.0 AU"),
    list("LIST hillshade (LiDAR)", "Hillshade", 18, "CC BY 3.0 AU"),
    Basemap("OpenStreetMap", "https://tile.openstreetmap.org/{z}/{x}/{y}.png", 19, "© OpenStreetMap contributors"),
)

private fun styleJson(b: Basemap) = JSONObject()
    .put("version", 8)
    .put("sources", JSONObject().put("base", JSONObject().put("type", "raster").put("tiles", JSONArray().put(b.url)).put("tileSize", 256).put("maxzoom", b.maxZoom).put("attribution", b.attribution)))
    .put("layers", JSONArray().put(JSONObject().put("id", "base").put("type", "raster").put("source", "base")))
    .toString()

private fun LatLngBounds.padded(m: Double = 0.0005): LatLngBounds {
    val c = center
    return LatLngBounds.Builder().include(southWest).include(northEast).include(LatLng(c.latitude - m, c.longitude - m)).include(LatLng(c.latitude + m, c.longitude + m)).build()
}

/** The crags map: MapLibre over the web map's basemaps, with our own grid clustering (named for the area the crags share), a callout, and a choice of directions apps. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(model: AppModel) {
    val context = LocalContext.current
    var all by remember { mutableStateOf<List<CragPoint>>(emptyList()) }
    var baseIndex by remember { mutableStateOf(model.prefs.sp.getInt("mapBase", 0).coerceIn(0, basemaps.lastIndex)) }
    var selected by remember { mutableStateOf<CragPoint?>(null) }
    var directionsFor by remember { mutableStateOf<CragPoint?>(null) }
    var typeMenu by remember { mutableStateOf(false) }
    val previous = remember { mutableStateListOf<LatLngBounds>() }
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var style by remember { mutableStateOf<Style?>(null) }
    var latSpan by remember { mutableStateOf(5.2) }
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
    LaunchedEffect(focus, shown.count { it.guideId == focus }, map) {
        val m = map ?: return@LaunchedEffect
        previous.clear(); selected = null
        val mine = if (focus == null) emptyList() else shown.filter { it.guideId == focus }
        if (mine.isNotEmpty()) {
            val b = LatLngBounds.Builder().also { bb -> mine.forEach { bb.include(LatLng(it.latitude, it.longitude)) } }.build()
            m.animateCamera(CameraUpdateFactory.newLatLngBounds(b.padded(), 120))
        } else if (shown.size > 1) m.animateCamera(CameraUpdateFactory.newLatLngZoom(Tasmania, 6.2))
    }

    val items = remember(shown, latSpan) { ClusterEngine.build(shown, latSpan, { p -> chainOf(model, p) }) }

    // The map's markers: one symbol per item, its icon named in the feature (a pin, or a numbered disc made on demand).
    LaunchedEffect(items, style) {
        val st = style ?: return@LaunchedEffect
        val features = items.mapIndexed { i, item ->
            val (lat, lon, icon) = when (item) {
                is MapItem.Single -> Triple(item.point.latitude, item.point.longitude, "pin")
                is MapItem.Cluster -> Triple(item.latitude, item.longitude, "c${item.points.size}")
            }
            if (st.getImage(icon) == null) st.addImage(icon, if (icon == "pin") pinBitmap() else clusterBitmap(icon.drop(1).toInt()))
            Feature.fromGeometry(Point.fromLngLat(lon, lat)).also { it.addNumberProperty("i", i); it.addStringProperty("icon", icon) }
        }
        st.getSourceAs<GeoJsonSource>("items")?.setGeoJson(FeatureCollection.fromFeatures(features))
    }
    LaunchedEffect(located, style) {
        val m = map ?: return@LaunchedEffect
        val st = style ?: return@LaunchedEffect
        if (located) runCatching { m.locationComponent.apply { activateLocationComponent(LocationComponentActivationOptions.builder(context, st).build()); @Suppress("MissingPermission") isLocationComponentEnabled = true } }
    }
    val itemsNow by rememberUpdatedState(items)

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(focusTitle) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Chrome.bar, titleContentColor = Chrome.light, actionIconContentColor = Chrome.light),
            navigationIcon = {
                Box {
                    TextButton(onClick = { typeMenu = true }) { Text(basemaps[baseIndex].name, color = Chrome.light) }
                    DropdownMenu(expanded = typeMenu, onDismissRequest = { typeMenu = false }) {
                        basemaps.forEachIndexed { i, b -> DropdownMenuItem(text = { Text(b.name) }, onClick = { baseIndex = i; model.prefs.sp.edit().putInt("mapBase", i).apply(); typeMenu = false }) }
                    }
                }
            },
            actions = { if (focus != null) TextButton(onClick = { model.mapFocus = null }) { Text("All crags", color = Chrome.light) } },
        )
        Box(Modifier.fillMaxSize()) {
            val lifecycle = LocalLifecycleOwner.current.lifecycle
            val mapView = remember { MapLibre.getInstance(context); MapView(context) }
            DisposableEffect(lifecycle, mapView) {
                val observer = LifecycleEventObserver { _, e ->
                    when (e) {
                        Lifecycle.Event.ON_START -> mapView.onStart()
                        Lifecycle.Event.ON_RESUME -> mapView.onResume()
                        Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                        Lifecycle.Event.ON_STOP -> mapView.onStop()
                        else -> {}
                    }
                }
                lifecycle.addObserver(observer)
                if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) mapView.onStart()
                if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) mapView.onResume()
                onDispose { lifecycle.removeObserver(observer); mapView.onPause(); mapView.onStop(); mapView.onDestroy() }
            }
            AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())
            LaunchedEffect(mapView) {
                mapView.getMapAsync { m ->
                    m.cameraPosition = CameraPosition.Builder().target(Tasmania).zoom(6.2).build()
                    m.uiSettings.isRotateGesturesEnabled = false
                    m.uiSettings.isLogoEnabled = false
                    m.addOnCameraIdleListener { latSpan = m.projection.visibleRegion.latLngBounds.latitudeSpan }
                    m.addOnMapClickListener { at ->
                        val hit = m.queryRenderedFeatures(m.projection.toScreenLocation(at), "items").firstOrNull()?.getNumberProperty("i")?.toInt()
                        when (val item = hit?.let { itemsNow.getOrNull(it) }) {
                            is MapItem.Single -> selected = item.point
                            is MapItem.Cluster -> {
                                selected = null
                                previous.add(m.projection.visibleRegion.latLngBounds)
                                val b = LatLngBounds.Builder().also { bb -> item.points.forEach { bb.include(LatLng(it.latitude, it.longitude)) } }.build()
                                m.animateCamera(CameraUpdateFactory.newLatLngBounds(b.padded(), 100))
                            }
                            null -> selected = null
                        }
                        true
                    }
                    map = m
                }
            }
            LaunchedEffect(map, baseIndex) {
                val m = map ?: return@LaunchedEffect
                style = null
                m.setStyle(Style.Builder().fromJson(styleJson(basemaps[baseIndex]))) { st ->
                    st.addSource(GeoJsonSource("items"))
                    st.addLayer(SymbolLayer("items", "items").withProperties(PropertyFactory.iconImage(Expression.get("icon")), PropertyFactory.iconAllowOverlap(true), PropertyFactory.iconIgnorePlacement(true)))
                    style = st
                }
            }
            if (previous.isNotEmpty()) FilledIconButton(onClick = { val b = previous.removeAt(previous.lastIndex); map?.animateCamera(CameraUpdateFactory.newLatLngBounds(b, 0)) }, Modifier.align(Alignment.TopStart).padding(12.dp)) { Icon(Icons.AutoMirrored.Filled.Undo, "Back to the previous view") }
            Text(basemaps[baseIndex].attribution, Modifier.align(Alignment.BottomStart).background(Color(0x99FFFFFF)).padding(horizontal = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color.Black)
            selected?.let { p ->
                Card(Modifier.align(Alignment.BottomCenter).padding(12.dp).padding(bottom = 16.dp).fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
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

private fun disc(size: Int, fill: Int, text: String?): Bitmap {
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = 0xFFFFFFFF.toInt(); c.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.color = fill; c.drawCircle(size / 2f, size / 2f, size / 2f - size / 16f, paint)
    if (text != null) {
        paint.color = 0xFFFFFFFF.toInt(); paint.textAlign = Paint.Align.CENTER; paint.textSize = if (text.length > 2) 30f else 38f; paint.isFakeBoldText = true
        c.drawText(text, size / 2f, size / 2f + paint.textSize / 3, paint)
    }
    return bmp
}

private fun pinBitmap() = disc(40, 0xFF1E88E5.toInt(), null)

private fun clusterBitmap(count: Int) = disc(96, 0xFF1B1464.toInt(), count.toString())
