import { pathData } from '#/guide/model/geometry'
import type { ImageTopo, Point, RectStyle, RoutePath, TopoRect } from '#/guide/model/types'

/** Pure edits to a topo. Each returns a new topo and keeps path data in sync with points. */

const withPoints = (path: RoutePath, points: Point[]): RoutePath => ({ ...path, points, d: pathData(points) })

const mapPath = (topo: ImageTopo, id: string, fn: (p: RoutePath) => RoutePath): ImageTopo => ({
  ...topo,
  paths: topo.paths.map((p) => (p.id === id ? fn(p) : p)),
})

export function addPath(topo: ImageTopo, id: string, points: Point[], linkedTo = ''): ImageTopo {
  const path: RoutePath = { id, points, d: pathData(points), linkedTo, lineStyle: 'solid', labelText: '', arrow: false, other: {} }
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
  const rect: TopoRect = { id, x: at.x, y: at.y, width: 80, height: 36, style, arrowDirection: '', text: 'Label', other: {} }
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
