import type { RoutePath } from '#/guide/model/types'

/** The old editor's number circle, in photo pixels. Guides painted over old numbers rely on its size and spot. */
export const LABEL_SIZE = 22

type Pt = { x: number; y: number }
const key = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`

/**
 * Where each route's number goes, as the old editor placed it (RoutePoint.updateLabelPosition):
 * on a "label" point when one follows the start; otherwise beside the start, away from the way the
 * route sets off, below a lone marker, fanned out where routes share a start, and kept inside the photo.
 * `scale` grows the circle on small screens, and its offsets with it.
 */
export function labelSpots(paths: RoutePath[], width: number, height: number, scale = 1): Map<string, Pt> {
  // Points on the same pixel form a group, in the order the old editor made them.
  const groups = new Map<string, Pt[]>()
  for (const path of paths) for (const p of path.points) groups.set(key(p), [...(groups.get(key(p)) ?? []), p])

  const size = LABEL_SIZE * scale
  const half = size / 2
  const spots = new Map<string, Pt>()
  for (const path of paths) {
    const labelAt = path.points.findIndex((p) => p.kind === 'label')
    if (labelAt > 0) {
      const { x, y } = path.points[labelAt]
      spots.set(path.id, { x, y })
      continue
    }
    const [at, next] = path.points
    if (!at) continue
    const group = groups.get(key(at))!
    // Java's integer division: two routes give 0 and 1, three give -1, 0 and 1.
    const split = Math.trunc((1 - group.length) / 2) + group.indexOf(at)
    let dx = -split * size
    let dy = half * 2
    if (next) {
      const ndx = next.x - at.x
      const ndy = next.y - at.y
      if (Math.abs(ndx) < Math.abs(ndy)) [dx, dy] = ndy > 0 ? [-split * size, -half * 1.2] : [split * size, half * 1.2]
      else [dx, dy] = ndx < 0 ? [half * 1.2, -split * size] : [-half * 1.2, split * size]
    }
    const left = Math.min(Math.max(0, Math.round(at.x - half + dx)), width - size)
    const top = Math.min(Math.max(0, Math.round(at.y - half + dy)), height - size)
    spots.set(path.id, { x: left + half, y: top + half })
  }
  return spots
}
