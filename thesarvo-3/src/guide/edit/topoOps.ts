import { pathData } from '#/guide/model/geometry'
import type { ImageTopo, Point, RectStyle, RoutePath, TopoRect } from '#/guide/model/types'

/** Pure edits to a topo. Each returns a new topo and keeps path data in sync with points. */

const withPoints = (path: RoutePath, points: Point[]): RoutePath => ({ ...path, points, d: pathData(points) })

const mapPath = (topo: ImageTopo, id: string, fn: (p: RoutePath) => RoutePath): ImageTopo => ({
  ...topo,
  paths: topo.paths.map((p) => (p.id === id ? fn(p) : p)),
})

export function addPath(topo: ImageTopo, id: string, points: Point[], linkedTo = '', arrow = false): ImageTopo {
  const path: RoutePath = { id, points, d: pathData(points), linkedTo, lineStyle: 'solid', labelText: '', arrow }
  return { ...topo, paths: [...topo.paths, path] }
}

export const movePoint = (topo: ImageTopo, pathId: string, index: number, to: { x: number; y: number }) =>
  mapPath(topo, pathId, (p) => withPoints(p, p.points.map((pt, i) => (i === index ? { ...pt, ...to } : pt))))

export const appendPoint = (topo: ImageTopo, pathId: string, point: Point) =>
  mapPath(topo, pathId, (p) => withPoints(p, [...p.points, point]))

/** Inserts a point after `index`, halfway to the next one. */
export function insertPointAfter(topo: ImageTopo, pathId: string, index: number): ImageTopo {
  return mapPath(topo, pathId, (p) => {
    const a = p.points[index]
    const b = p.points[index + 1]
    if (!a || !b) return p
    const mid: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, kind: '' }
    return withPoints(p, p.points.toSpliced(index + 1, 0, mid))
  })
}

/** Removes a point; a route needs at least two, so shorter ones are dropped entirely. */
export function removePoint(topo: ImageTopo, pathId: string, index: number): ImageTopo {
  const path = topo.paths.find((p) => p.id === pathId)
  if (!path) return topo
  if (path.points.length <= 2) return removePath(topo, pathId)
  return mapPath(topo, pathId, (p) => withPoints(p, p.points.filter((_, i) => i !== index)))
}

export const removePath = (topo: ImageTopo, id: string): ImageTopo => ({ ...topo, paths: topo.paths.filter((p) => p.id !== id) })

export const updatePath = (topo: ImageTopo, id: string, patch: Partial<RoutePath>) => mapPath(topo, id, (p) => ({ ...p, ...patch }))

export function addRect(topo: ImageTopo, id: string, at: { x: number; y: number }, style: RectStyle = 'black_text_on_solid_yellow'): ImageTopo {
  const rect: TopoRect = { id, x: at.x, y: at.y, width: 80, height: 36, style, arrowDirection: '', text: 'Label' }
  return { ...topo, rects: [...topo.rects, rect] }
}

export const updateRect = (topo: ImageTopo, id: string, patch: Partial<TopoRect>): ImageTopo => ({
  ...topo,
  rects: topo.rects.map((r) => (r.id === id ? { ...r, ...patch } : r)),
})

export const removeRect = (topo: ImageTopo, id: string): ImageTopo => ({ ...topo, rects: topo.rects.filter((r) => r.id !== id) })

/** Legend order follows the order climbs were ticked. */
export const toggleLegend = (topo: ImageTopo, climbId: string): ImageTopo => ({
  ...topo,
  legend: topo.legend.includes(climbId) ? topo.legend.filter((c) => c !== climbId) : [...topo.legend, climbId],
})

/** Sets the marker ('belay', 'lower' or '') on the last point of a route. */
export const setEndMarker = (topo: ImageTopo, pathId: string, kind: string): ImageTopo =>
  mapPath(topo, pathId, (p) => ({ ...p, points: p.points.map((pt, i) => (i === p.points.length - 1 ? { ...pt, kind } : pt)) }))

/** Sets the kind of one point, e.g. 'label' to say where the route number goes. */
export const setPointKind = (topo: ImageTopo, pathId: string, index: number, kind: string): ImageTopo =>
  mapPath(topo, pathId, (p) => ({ ...p, points: p.points.map((pt, i) => (i === index ? { ...pt, kind } : pt)) }))

/**
 * Sets how wide the topo is shown at most. Routes, labels and the legend are drawn in that width's
 * pixels, so they all scale with it and stay where they were on the photo.
 */
export function resize(topo: ImageTopo, width: number): ImageTopo {
  if (width <= 0 || width === topo.width) return topo
  const k = width / topo.width
  const r = (n: number) => Math.round(n * k)
  return {
    ...topo,
    width,
    height: r(topo.height),
    legendX: r(topo.legendX),
    legendY: r(topo.legendY),
    paths: topo.paths.map((p) => withPoints(p, p.points.map((pt) => ({ ...pt, x: r(pt.x), y: r(pt.y) })))),
    rects: topo.rects.map((rect) => ({ ...rect, x: r(rect.x), y: r(rect.y), width: r(rect.width), height: r(rect.height) })),
  }
}

/** A new route matches the topo's other routes; on a topo with none yet, boulder problems get arrow heads. */
export const newRouteArrow = (topo: ImageTopo, kind: 'climb' | 'problem') =>
  topo.paths.length ? topo.paths.filter((p) => p.arrow).length * 2 > topo.paths.length : kind === 'problem'

const clamp = (n: number, max: number) => Math.min(Math.max(0, n), max)

/** Moves one point of a route by (dx, dy), keeping it on the photo. */
export const nudgePoint = (topo: ImageTopo, pathId: string, index: number, dx: number, dy: number): ImageTopo => {
  const pt = topo.paths.find((p) => p.id === pathId)?.points[index]
  return pt ? movePoint(topo, pathId, index, { x: clamp(pt.x + dx, topo.width), y: clamp(pt.y + dy, topo.height) }) : topo
}

/** Moves a whole route; it stops at the photo's edge rather than squashing. */
export const nudgePath = (topo: ImageTopo, pathId: string, dx: number, dy: number): ImageTopo =>
  mapPath(topo, pathId, (p) => {
    const xs = p.points.map((pt) => pt.x)
    const ys = p.points.map((pt) => pt.y)
    const mx = Math.min(Math.max(dx, -Math.min(...xs)), topo.width - Math.max(...xs))
    const my = Math.min(Math.max(dy, -Math.min(...ys)), topo.height - Math.max(...ys))
    return withPoints(p, p.points.map((pt) => ({ ...pt, x: pt.x + mx, y: pt.y + my })))
  })

/** Moves a label by (dx, dy), keeping its corner on the photo. */
export const nudgeRect = (topo: ImageTopo, id: string, dx: number, dy: number): ImageTopo => {
  const r = topo.rects.find((rect) => rect.id === id)
  return r ? updateRect(topo, id, { x: clamp(r.x + dx, topo.width), y: clamp(r.y + dy, topo.height) }) : topo
}

/**
 * The start or end of another route within `radius` of `at`, else `at`: a new route that begins where
 * another begins or ends shares that exact pixel, so the numbers fan out and the lines join up.
 */
export function snapPoint(topo: ImageTopo, at: { x: number; y: number }, radius: number): { x: number; y: number } {
  let best = at
  let bestDist = radius
  for (const path of topo.paths)
    for (const pt of [path.points[0], path.points.at(-1)]) {
      const d = pt && Math.hypot(pt.x - at.x, pt.y - at.y)
      if (pt && d !== undefined && d <= bestDist) [best, bestDist] = [{ x: pt.x, y: pt.y }, d]
    }
  return best
}
