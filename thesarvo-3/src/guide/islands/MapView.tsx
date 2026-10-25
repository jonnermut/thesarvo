import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { GpsLine, GpsPoint } from '#/guide/model/types'

// Satellite is the default because that is what climbers use to find crags. Esri's imagery has no
// API key; add the Tasmanian LIST layers here (see plan-guide, map section) as further basemaps.
const BASEMAPS = {
  Satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 18,
    maxZoom: 20,
    attribution: 'Tiles © Esri — Maxar, Earthstar Geographics, and the GIS User Community',
  }),
  Map: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }),
}

const toLatLngs = (path: string): L.LatLngTuple[] =>
  path
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number.parseFloat))
    .filter((p): p is [number, number] => p.length === 2 && p.every((n) => !Number.isNaN(n)))

/** Leaflet map of GPS points and tracks. Loaded lazily and only in the browser. */
export default function MapView({ points, lines }: { points: GpsPoint[]; lines: GpsLine[] }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { scrollWheelZoom: false, layers: [BASEMAPS.Satellite] })
    L.control.layers(BASEMAPS, undefined, { position: 'topright' }).addTo(map)
    L.control.scale({ imperial: false }).addTo(map)

    const bounds = L.latLngBounds([])
    for (const line of lines) {
      const latlngs = toLatLngs(line.path)
      if (latlngs.length < 2) continue
      // White with a dark casing stays visible on both satellite and street maps.
      L.polyline(latlngs, { color: '#000', weight: 5, opacity: 0.4 }).addTo(map)
      L.polyline(latlngs, { color: '#fff', weight: 3 }).bindTooltip(line.description, { sticky: true }).addTo(map)
      bounds.extend(latlngs)
    }
    for (const p of points) {
      const lat = Number.parseFloat(p.latitude)
      const lon = Number.parseFloat(p.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue
      bounds.extend([lat, lon])
      L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#f7941e', fillOpacity: 1 })
        .bindTooltip(p.description || p.code, { direction: 'top' })
        .addTo(map)
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
    else map.setView([-42, 147], 7)

    return () => {
      map.remove()
    }
  }, [points, lines])

  return <div ref={el} className="h-96 w-full border border-line sm:h-[28rem]" />
}
