import { curveCatmullRom, line } from 'd3-shape'
import type { Point, RoutePath, TopoRect } from './types'

const smooth = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.5))

/** SVG path data for a route through `points`. Shared by the read view and the editor. */
export function pathData(points: Point[]): string {
  if (points.length < 2) return ''
  return smooth(points) ?? ''
}

type Pt = { x: number; y: number }

const length = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)

/** The spot `t` (0 start, 1 end) of the way along the route, measured along its straight segments. */
export function pointAlong(points: Point[], t: number): Pt {
  const first = points[0]
  if (!first) return { x: 0, y: 0 }
  const total = points.slice(1).reduce((n, p, i) => n + length(points[i], p), 0)
  if (!total) return { x: first.x, y: first.y }
  let left = Math.min(Math.max(t, 0), 1) * total
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = length(a, b)
    if (left <= seg && seg > 0) return { x: a.x + ((b.x - a.x) * left) / seg, y: a.y + ((b.y - a.y) * left) / seg }
    left -= seg
  }
  const last = points[points.length - 1]
  return { x: last.x, y: last.y }
}

/** How far along the route (0 to 1) the spot nearest to `at` is. */
export function nearestT(points: Point[], at: Pt): number {
  const total = points.slice(1).reduce((n, p, i) => n + length(points[i], p), 0)
  if (!total) return 0
  let best = { d: Infinity, along: 0 }
  let before = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = length(a, b)
    if (seg > 0) {
      const k = Math.min(1, Math.max(0, ((at.x - a.x) * (b.x - a.x) + (at.y - a.y) * (b.y - a.y)) / (seg * seg)))
      const d = Math.hypot(at.x - (a.x + k * (b.x - a.x)), at.y - (a.y + k * (b.y - a.y)))
      if (d < best.d) best = { d, along: before + k * seg }
    }
    before += seg
  }
  return best.along / total
}

/** Where a label's leader line meets its box: the spot of the box nearest to `from`; null when `from` is on or within `gap` of it. */
export function leaderEnd(box: { x: number; y: number; width: number; height: number }, from: Pt, gap = 6): Pt | null {
  const x = Math.min(Math.max(from.x, box.x), box.x + box.width)
  const y = Math.min(Math.max(from.y, box.y), box.y + box.height)
  return Math.hypot(from.x - x, from.y - y) <= gap ? null : { x, y }
}

/** The spot of its route a label points at, or undefined for a text box or a label whose route is gone. */
export const labelAnchor = (topo: { paths: RoutePath[] }, rect: TopoRect) => {
  const path = rect.route ? topo.paths.find((p) => p.id === rect.route) : undefined
  return path ? pointAlong(path.points, rect.t ?? 0.5) : undefined
}

