import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { GpsPoint } from '#/guide/model/types'

// Swap this for the Tasmanian LIST tile layer when we add it (see plan-guide, map section).
const TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

/** Leaflet map showing GPS points. Loaded lazily and only in the browser. */
export default function MapView({ points }: { points: GpsPoint[] }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!el.current) return
    const map = L.map(el.current, { scrollWheelZoom: false })
    L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: 19 }).addTo(map)

    const coords: L.LatLngTuple[] = []
    for (const p of points) {
      const lat = Number.parseFloat(p.latitude)
      const lon = Number.parseFloat(p.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue
      coords.push([lat, lon])
      L.circleMarker([lat, lon], { radius: 8, color: '#12302d', weight: 2, fillColor: '#f7941e', fillOpacity: 1 })
        .bindTooltip(p.description || p.code, { direction: 'top' })
        .addTo(map)
    }
    if (coords.length) map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 })
    else map.setView([-42, 147], 7)

    return () => {
      map.remove()
    }
  }, [points])

  return <div ref={el} className="h-80 w-full rounded-lg border border-line sm:h-96" />
}
