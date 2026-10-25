import { curveCatmullRom, line } from 'd3-shape'
import type { Point } from './types'

const smooth = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.5))

/** SVG path data for a route through `points`. Shared by the read view and the editor. */
export function pathData(points: Point[]): string {
  if (points.length < 2) return ''
  return smooth(points) ?? ''
}
