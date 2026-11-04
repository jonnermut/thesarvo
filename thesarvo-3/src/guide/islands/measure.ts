/** Distance and height along a path traced on a map. Heights come from Open-Meteo's elevation API (a 90 m grid, so the climb is approximate). */

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
