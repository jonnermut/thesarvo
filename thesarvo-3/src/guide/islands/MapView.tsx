import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { GpsLine, GpsPoint, GpsShape } from '#/guide/model/types'

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

const MAX_AUTO_HANDLES = 12

const AREA = { color: '#f7941e', weight: 2, fillOpacity: 0.15 }

const toLatLngs = (path: string): L.LatLngTuple[] =>
  path
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number.parseFloat))
    .filter((p): p is [number, number] => p.length === 2 && p.every((n) => !Number.isNaN(n)))

/** What the editor can draw by clicking on the map. */
export type MapTool = 'none' | 'point' | 'polyline' | 'polygon' | 'rectangle'

export type MapEdit = {
  onAddPoint: (lat: number, lon: number) => void
  onMovePoint: (pid: string, lat: number, lon: number) => void
  onAddLine: (shape: GpsShape, path: string) => void
  onMoveLine: (index: number, path: string) => void
}

type Props = {
  points: GpsPoint[]
  lines: GpsLine[]
  /** `pid` of the point to highlight, e.g. the table row last clicked. */
  selected?: string | null
  onSelect?: (pid: string) => void
  /** Present in the editor: points and line vertices become draggable and the toolbar appears. */
  edit?: MapEdit
}

const pathText = (latlngs: L.LatLng[]) => latlngs.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(' ')

const handleIcon = (cls: string) => L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [18, 18] })
const POINT_HANDLE = handleIcon('size-[18px] rounded-full border-2 border-white bg-amber shadow')
const VERTEX_HANDLE = handleIcon('size-[14px] m-[2px] border-2 border-white bg-navy shadow')

const TOOLS: [MapTool, string][] = [
  ['point', 'Add point'],
  ['polyline', 'Draw track'],
  ['polygon', 'Draw area'],
  ['rectangle', 'Draw box'],
]

/** Leaflet map of GPS points and tracks. Loaded lazily and only in the browser. */
export default function MapView({ points, lines, selected, onSelect, edit }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const draft = useRef<L.Polyline | null>(null)
  const fitted = useRef(false)
  const markers = useRef(new Map<string, L.Marker | L.CircleMarker>())
  const select = useRef(onSelect)
  select.current = onSelect
  const editRef = useRef(edit)
  editRef.current = edit
  const [tool, setTool] = useState<MapTool>('none')
  // Long tracks would drown the map in handles, so only the clicked line (or a short one) gets them.
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [drawn, setDrawn] = useState<L.LatLng[]>([])
  const toolRef = useRef(tool)
  toolRef.current = tool
  const drawnRef = useRef(drawn)
  drawnRef.current = drawn

  const finish = (shape: GpsShape, latlngs: L.LatLng[]) => {
    editRef.current?.onAddLine(shape, pathText(latlngs))
    setDrawn([])
    setTool('none')
  }

  // The map itself is created once, so dragging never resets the view.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: false, layers: [BASEMAPS.Satellite] })
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    L.control.layers(BASEMAPS, undefined, { position: 'topright' }).addTo(m)
    L.control.attribution({ prefix: false }).addTo(m)
    L.control.scale({ imperial: false }).addTo(m)
    m.setView([-42, 147], 7)
    m.on('click', (e: L.LeafletMouseEvent) => {
      const t = toolRef.current
      if (t === 'point') {
        editRef.current?.onAddPoint(e.latlng.lat, e.latlng.lng)
        setTool('none')
      } else if (t === 'rectangle') {
        const next = [...drawnRef.current, e.latlng]
        if (next.length === 2) finish('rectangle', next)
        else setDrawn(next)
      } else if (t !== 'none') setDrawn([...drawnRef.current, e.latlng])
    })
    return () => {
      m.remove()
      map.current = null
      layer.current = null
      fitted.current = false
    }
  }, [])

  // The in-progress shape.
  useEffect(() => {
    const m = map.current
    if (!m) return
    draft.current?.remove()
    draft.current = drawn.length ? L.polyline(drawn, { color: '#f7941e', weight: 3, dashArray: '6 6' }).addTo(m) : null
    m.getContainer().style.cursor = tool === 'none' ? '' : 'crosshair'
  }, [drawn, tool])

  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    markers.current.clear()
    const editing = !!editRef.current
    const bounds = L.latLngBounds([])
    lines.forEach((line, index) => {
      const latlngs = toLatLngs(line.path)
      if (latlngs.length < 2) return
      const area = line.shape !== 'polyline'
      // Areas are shaded outlines; a rectangle is stored as two opposite corners.
      const shape = (
        line.shape === 'rectangle' ? L.rectangle([latlngs[0], latlngs[1]], AREA) : area ? L.polygon(latlngs, AREA) : L.polyline(latlngs, { color: '#fff', weight: 3 })
      ) as L.Polygon
      if (!area) L.polyline(latlngs, { color: '#000', weight: 5, opacity: 0.4 }).addTo(group) // dark casing: visible on satellite and street maps
      shape.bindTooltip(line.description, { sticky: true }).addTo(group)
      bounds.extend(latlngs)
      if (!editing) return
      shape.on('click', () => setActiveLine(index))
      if (index !== activeLine && latlngs.length > MAX_AUTO_HANDLES) return
      // One draggable handle per stored vertex; the shape follows live and is saved on release.
      const current = line.shape === 'rectangle' ? latlngs.slice(0, 2) : latlngs
      const handles = current.map((ll) => L.marker(ll, { icon: VERTEX_HANDLE, draggable: true }).addTo(group))
      handles.forEach((h) =>
        h
          .on('drag', () => {
            const moved = handles.map((x) => x.getLatLng())
            if (shape instanceof L.Rectangle) shape.setBounds(L.latLngBounds(moved[0], moved[1]))
            else shape.setLatLngs(moved)
          })
          .on('dragend', () => editRef.current?.onMoveLine(index, pathText(handles.map((x) => x.getLatLng())))),
      )
    })
    for (const p of points) {
      const lat = Number.parseFloat(p.latitude)
      const lon = Number.parseFloat(p.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue
      bounds.extend([lat, lon])
      const marker = editing
        ? L.marker([lat, lon], { icon: POINT_HANDLE, draggable: true }).on('dragend', (e) => {
            const at = (e.target as L.Marker).getLatLng()
            editRef.current?.onMovePoint(p.pid, at.lat, at.lng)
          })
        : L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#f7941e', fillOpacity: 1 })
      marker
        .bindTooltip(p.description || p.code, { direction: 'top' })
        .on('click', () => select.current?.(p.pid))
        .addTo(group)
      markers.current.set(p.pid, marker)
    }
    // Fit once: after that the view is the user's, even while they edit.
    if (!fitted.current && bounds.isValid()) {
      m.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
      fitted.current = true
    }
  }, [points, lines, activeLine])

  // Move to the selected point and open its label.
  useEffect(() => {
    const marker = selected ? markers.current.get(selected) : undefined
    if (!marker || !map.current) return
    map.current.flyTo(marker.getLatLng(), Math.max(map.current.getZoom(), 16), { duration: 0.6 })
    marker.openTooltip()
  }, [selected])

  const btn = 'rounded border border-line bg-paper px-2.5 py-1 text-[13px] hover:bg-black/5'
  return (
    <>
      {edit && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {TOOLS.map(([id, label]) => (
            <button key={id} type="button" className={`${btn} ${tool === id ? 'border-amber bg-amber/20' : ''}`} onClick={() => { setDrawn([]); setTool(tool === id ? 'none' : id) }}>
              {label}
            </button>
          ))}
          {(tool === 'polyline' || tool === 'polygon') && (
            <>
              <button type="button" className={btn} disabled={drawn.length < (tool === 'polygon' ? 3 : 2)} onClick={() => finish(tool, drawn)}>Finish</button>
              <button type="button" className={btn} disabled={!drawn.length} onClick={() => setDrawn(drawn.slice(0, -1))}>Undo point</button>
            </>
          )}
          <span className="text-[13px] text-muted">
            {tool === 'point' ? 'Click the map to place the point.' : tool === 'rectangle' ? 'Click two opposite corners.' : tool === 'none' ? 'Drag points and handles to move them; click a long track to edit its vertices.' : 'Click to add vertices, then Finish.'}
          </span>
        </div>
      )}
      <div ref={el} className="h-96 w-full border border-line sm:h-[28rem]" />
    </>
  )
}
