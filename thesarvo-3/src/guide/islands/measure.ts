/**
 * Distance and height along a path traced on a map. Heights come from theLIST's 10 m contour lines (every metre of climb is counted
 * where the path crosses a contour, so a steep gully is not smoothed away as it is on a 90 m grid), with Open-Meteo's elevation
 * grid as the fallback when theLIST does not answer.
 */

export type LatLng = { lat: number; lng: number }

const R = 6371008.8

/** Great-circle distance in metres. */
export function distance(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const pathLength = (path: LatLng[]) => path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0)

/** Points spread evenly along the path, about `step` metres apart and at most `max` of them, the ends included. */
export function sample(path: LatLng[], step = 50, max = 100): LatLng[] {
  const total = pathLength(path)
  if (path.length < 2 || total === 0) return path.slice(0, 1)
  const n = Math.min(max, Math.max(2, Math.ceil(total / step) + 1))
  const out: LatLng[] = []
  let leg = 0
  let legStart = 0
  for (let k = 0; k < n; k++) {
    const at = (total * k) / (n - 1)
    while (leg < path.length - 2 && legStart + distance(path[leg], path[leg + 1]) < at) {
      legStart += distance(path[leg], path[leg + 1])
      leg++
    }
    const len = distance(path[leg], path[leg + 1])
    const f = len === 0 ? 0 : Math.min(1, Math.max(0, (at - legStart) / len))
    out.push({ lat: path[leg].lat + (path[leg + 1].lat - path[leg].lat) * f, lng: path[leg].lng + (path[leg + 1].lng - path[leg].lng) * f })
  }
  return out
}

/** Total metres climbed and descended along heights taken in order. */
export function climb(heights: number[]): { up: number; down: number } {
  let up = 0
  let down = 0
  for (let i = 1; i < heights.length; i++) {
    const d = heights[i] - heights[i - 1]
    if (d > 0) up += d
    else down -= d
  }
  return { up, down }
}

/** Heights in metres at each point (at most 100 per request). */
export async function elevations(points: LatLng[], signal?: AbortSignal): Promise<number[]> {
  const q = new URLSearchParams({ latitude: points.map((p) => p.lat.toFixed(5)).join(','), longitude: points.map((p) => p.lng.toFixed(5)).join(',') })
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?${q}`, { signal })
  if (!res.ok) throw new Error(`Elevation answered ${res.status}`)
  const body: unknown = await res.json()
  const h = typeof body === 'object' && body !== null && 'elevation' in body ? body.elevation : undefined
  if (!Array.isArray(h) || h.length !== points.length || !h.every((x) => typeof x === 'number')) throw new Error('Unexpected elevation answer')
  return h
}

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`)


/** A contour line of theLIST: its height and its parts as [lng, lat] vertices. */
export type Contour = { elevation: number; paths: number[][][] }

const LIST_CONTOURS = 'https://services.thelist.tas.gov.au/arcgis/rest/services/Public/TopographyAndRelief/MapServer/12/query'

/** Past this the answer would be too big to be worth waiting for. */
export const MAX_CONTOUR_PATH = 20000

/** The 10 m contours the path crosses; throws when theLIST says there are more than it will send at once. */
export async function fetchContours(path: LatLng[], signal?: AbortSignal): Promise<Contour[]> {
  const body = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ paths: [path.map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))])], spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPolyline',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'ELEVATION',
    returnGeometry: 'true',
    geometryPrecision: '6',
  })
  const res = await fetch(LIST_CONTOURS, { method: 'POST', body, signal })
  if (!res.ok) throw new Error(`theLIST answered ${res.status}`)
  const json: unknown = await res.json()
  if (typeof json !== 'object' || json === null || !('features' in json) || !Array.isArray(json.features)) throw new Error('Unexpected contour answer')
  if ('exceededTransferLimit' in json && json.exceededTransferLimit) throw new Error('Too many contours')
  return json.features.flatMap((f: unknown): Contour[] => {
    if (typeof f !== 'object' || f === null || !('attributes' in f) || !('geometry' in f)) return []
    const a = f.attributes
    const g = f.geometry
    if (typeof a !== 'object' || a === null || !('ELEVATION' in a) || typeof a.ELEVATION !== 'number') return []
    if (typeof g !== 'object' || g === null || !('paths' in g) || !Array.isArray(g.paths)) return []
    return [{ elevation: a.ELEVATION, paths: g.paths as number[][][] }]
  })
}

/** Where along the path (metres) it crosses each contour, in order, with the contour's height. */
export function crossings(path: LatLng[], contours: Contour[]): { at: number; elevation: number }[] {
  const out: { at: number; elevation: number }[] = []
  if (path.length < 2) return out
  // Flat coordinates near the path, metres from its start.
  const k = Math.cos((path[0].lat * Math.PI) / 180)
  const flat = (lng: number, lat: number): [number, number] => [(lng - path[0].lng) * k * 111320, (lat - path[0].lat) * 110574]
  let before = 0
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = flat(path[i].lng, path[i].lat)
    const [bx, by] = flat(path[i + 1].lng, path[i + 1].lat)
    const len = distance(path[i], path[i + 1])
    const dx = bx - ax
    const dy = by - ay
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    for (const c of contours) {
      for (const line of c.paths) {
        let [px, py] = line.length ? flat(line[0][0], line[0][1]) : [0, 0]
        for (let j = 1; j < line.length; j++) {
          const [qx, qy] = flat(line[j][0], line[j][1])
          if (!((px < minX && qx < minX) || (px > maxX && qx > maxX) || (py < minY && qy < minY) || (py > maxY && qy > maxY))) {
            const ex = qx - px
            const ey = qy - py
            const den = dx * ey - dy * ex
            if (den !== 0) {
              const t = ((px - ax) * ey - (py - ay) * ex) / den
              const u = ((px - ax) * dy - (py - ay) * dx) / den
              if (t >= 0 && t < 1 && u >= 0 && u < 1) out.push({ at: before + t * len, elevation: c.elevation })
            }
          }
          px = qx
          py = qy
        }
      }
    }
    before += len
  }
  return out.sort((a, b) => a.at - b.at)
}

/** Climb and descent from the contours crossed in order: each crossing of a higher or lower line counts its difference. */
export const climbOverContours = (path: LatLng[], contours: Contour[]) => climb(crossings(path, contours).map((c) => c.elevation))
