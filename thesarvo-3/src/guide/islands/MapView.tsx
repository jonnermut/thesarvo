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
    attribution: '© Esri, Maxar, Earthstar Geographics',
  }),
  Map: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }),
}

const AREA = { color: '#f7941e', weight: 2, fillOpacity: 0.15 }

const toLatLngs = (path: string): L.LatLngTuple[] =>
  path
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number.parseFloat))
    .filter((p): p is [number, number] => p.length === 2 && p.every((n) => !Number.isNaN(n)))

/** Leaflet map of GPS points and tracks. Loaded lazily and only in the browser. */
type Props = {
  points: GpsPoint[]
  lines: GpsLine[]
  /** `pid` of the point to highlight, e.g. the table row last clicked. */
  selected?: string | null
  onSelect?: (pid: string) => void
}

export default function MapView({ points, lines, selected, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.CircleMarker>())
  const select = useRef(onSelect)
  select.current = onSelect

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: false, layers: [BASEMAPS.Satellite] })
    map.current = m
    L.control.layers(BASEMAPS, undefined, { position: 'topright' }).addTo(m)
    L.control.attribution({ prefix: false }).addTo(m)
    L.control.scale({ imperial: false }).addTo(m)

    const bounds = L.latLngBounds([])
    for (const line of lines) {
      const latlngs = toLatLngs(line.path)
      if (latlngs.length < 2) continue
      if (line.shape !== 'polyline') {
        // Areas are shaded outlines; a rectangle is stored as two opposite corners.
        const shape = line.shape === 'rectangle' ? L.rectangle([latlngs[0], latlngs[1]], AREA) : L.polygon(latlngs, AREA)
        shape.bindTooltip(line.description, { sticky: true }).addTo(m)
        bounds.extend(latlngs)
        continue
      }
      // White with a dark casing stays visible on both satellite and street maps.
      L.polyline(latlngs, { color: '#000', weight: 5, opacity: 0.4 }).addTo(m)
      L.polyline(latlngs, { color: '#fff', weight: 3 }).bindTooltip(line.description, { sticky: true }).addTo(m)
      bounds.extend(latlngs)
    }
    for (const p of points) {
      const lat = Number.parseFloat(p.latitude)
      const lon = Number.parseFloat(p.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue
      bounds.extend([lat, lon])
      const marker = L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#f7941e', fillOpacity: 1 })
        .bindTooltip(p.description || p.code, { direction: 'top' })
        .on('click', () => select.current?.(p.pid))
        .addTo(m)
      markers.current.set(p.pid, marker)
    }
    if (bounds.isValid()) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
    else m.setView([-42, 147], 7)

    return () => {
      m.remove()
      map.current = null
      markers.current.clear()
    }
  }, [points, lines])

  // Move to the selected point and open its label.
  useEffect(() => {
    const marker = selected ? markers.current.get(selected) : undefined
    if (!marker || !map.current) return
    map.current.flyTo(marker.getLatLng(), Math.max(map.current.getZoom(), 16), { duration: 0.6 })
    marker.openTooltip()
  }, [selected])

  return <div ref={el} className="h-96 w-full border border-line sm:h-[28rem]" />
}
