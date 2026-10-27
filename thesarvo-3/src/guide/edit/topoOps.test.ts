import { describe, expect, it } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { addPath, addRect, newRouteArrow, insertPointAfter, movePoint, nudgePath, nudgePoint, nudgeRect, reframe, removePoint, resize, setPointKind, setLegendOnPhoto, snapPoint, toggleLegend } from './topoOps'

const empty: ImageTopo = {
  type: 'image', id: '1', src: 'a.jpg', width: 100, height: 100, noPrint: false, printLayout: '',
  legendTitle: '', legendFooter: '', legendX: 0, legendY: 0, legend: [], paths: [], rects: [], otherShapes: [],
}
const pt = (x: number, y: number) => ({ x, y, kind: '' })

describe('topo ops', () => {
  const topo = addPath(empty, 'p1', [pt(0, 0), pt(10, 10), pt(20, 0)], 'c1')

  it('creates a route with generated path data', () => {
    expect(topo.paths[0]).toMatchObject({ id: 'p1', linkedTo: 'c1', lineStyle: 'solid' })
    expect(topo.paths[0].d).toMatch(/^M0,0C/)
  })

  it('moving a point regenerates the path data', () => {
    const moved = movePoint(topo, 'p1', 1, { x: 50, y: 50 })
    expect(moved.paths[0].points[1]).toMatchObject({ x: 50, y: 50 })
    expect(moved.paths[0].d).not.toBe(topo.paths[0].d)
  })

  it('inserts a point halfway to the next one', () => {
    expect(insertPointAfter(topo, 'p1', 0).paths[0].points[1]).toMatchObject({ x: 5, y: 5 })
  })

  it('drops a route when fewer than two points would remain', () => {
    const two = addPath(empty, 'p2', [pt(0, 0), pt(1, 1)])
    expect(removePoint(two, 'p2', 0).paths).toHaveLength(0)
    expect(removePoint(topo, 'p1', 1).paths[0].points).toHaveLength(2)
  })

  it('toggles legend entries in tick order', () => {
    const t = toggleLegend(toggleLegend(empty, 'b'), 'a')
    expect(t.legend).toEqual(['b', 'a'])
    expect(toggleLegend(t, 'b').legend).toEqual(['a'])
  })

  it('turns the legend on the photo on and off, keeping the other legacy attributes', () => {
    const on = setLegendOnPhoto({ ...empty, other: { legendExtraPage: 'x' } }, true)
    expect(on.other).toEqual({ legendExtraPage: 'x', legend: 'true' })
    expect(setLegendOnPhoto(on, false).other).toEqual({ legendExtraPage: 'x' })
  })

  it('marks one point as the label position', () => {
    const marked = setPointKind(topo, 'p1', 1, 'label')
    expect(marked.paths[0].points.map((p) => p.kind)).toEqual(['', 'label', ''])
  })
})

describe('resize', () => {
  it('scales the photo and everything drawn on it together', () => {
    let t = addPath({ ...empty, width: 400, height: 301 }, 'p', [{ x: 100, y: 50, kind: '' }, { x: 200, y: 150, kind: 'label' }])
    t = addRect({ ...t, legendX: 40, legendY: 20 }, 'r', { x: 10, y: 10 })
    const half = resize(t, t.width / 2)
    expect([half.width, half.height]).toEqual([t.width / 2, Math.round(t.height / 2)])
    expect(half.paths[0].points).toEqual([{ x: 50, y: 25, kind: '' }, { x: 100, y: 75, kind: 'label' }])
    expect(half.paths[0].d).not.toBe(t.paths[0].d)
    expect([half.rects[0].x, half.rects[0].width, half.legendX, half.legendY]).toEqual([5, 40, 20, 10])
  })
})

describe('reframe', () => {
  it('moves routes, labels and the legend onto an edited copy of the photo', () => {
    let t = addPath({ ...empty, width: 400, height: 300, legendX: 0, legendY: 0 }, 'p', [pt(200, 150), pt(300, 0)])
    t = addRect(t, 'r', { x: 300, y: 100 })
    // The right half of the photo, as a new photo 200 wide.
    const right = (x: number, y: number) => ({ x: (x - 200) / 200, y: y / 300 })
    const moved = reframe(t, 'b.jpg', 200, 300, right)
    expect([moved.src, moved.width, moved.height]).toEqual(['b.jpg', 200, 300])
    expect(moved.paths[0].points).toEqual([pt(0, 150), pt(100, 0)])
    expect(moved.paths[0].d).not.toBe(t.paths[0].d)
    // The label keeps its size and its centre moves; the legend, now off the photo, is kept on its edge.
    const [before, after] = [t.rects[0], moved.rects[0]]
    expect([after.width, after.height]).toEqual([before.width, before.height])
    expect(after.x).toBe(before.x - 200)
    expect([moved.legendX, moved.legendY]).toEqual([0, 0])
  })
})

describe('newRouteArrow', () => {
  const withArrows = (...arrows: boolean[]) => ({ ...empty, paths: arrows.map((arrow, i) => ({ id: `${i}`, points: [], d: '', linkedTo: '', lineStyle: 'solid' as const, labelText: '', arrow })) })
  it('gives arrow heads to the first route on a bouldering topo only', () => {
    expect(newRouteArrow(empty, 'problem')).toBe(true)
    expect(newRouteArrow(empty, 'climb')).toBe(false)
  })
  it('follows most of the topo’s routes once it has some', () => {
    expect(newRouteArrow(withArrows(false, false, true), 'problem')).toBe(false)
    expect(newRouteArrow(withArrows(true, true, false), 'climb')).toBe(true)
  })
})

describe('nudging and snapping', () => {
  const topo = addPath(empty, 'p1', [pt(5, 50), pt(40, 60), pt(90, 10)])

  it('nudges one point and keeps it on the photo', () => {
    expect(nudgePoint(topo, 'p1', 1, 10, -5).paths[0].points[1]).toMatchObject({ x: 50, y: 55 })
    expect(nudgePoint(topo, 'p1', 0, -10, 0).paths[0].points[0].x).toBe(0)
  })
  it('nudges a whole route, stopping at the edge instead of squashing it', () => {
    expect(nudgePath(topo, 'p1', 3, 0).paths[0].points.map((p) => p.x)).toEqual([8, 43, 93])
    expect(nudgePath(topo, 'p1', 50, 0).paths[0].points.map((p) => p.x)).toEqual([15, 50, 100])
  })
  it('nudges a label', () => {
    const t = addRect(empty, 'r', { x: 10, y: 10 })
    expect(nudgeRect(t, 'r', 10, -20).rects[0]).toMatchObject({ x: 20, y: 0 })
  })
  it('snaps to the nearest start or end of a route within the radius', () => {
    expect(snapPoint(topo, { x: 8, y: 52 }, 10)).toEqual({ x: 5, y: 50 })
    expect(snapPoint(topo, { x: 86, y: 14 }, 10)).toEqual({ x: 90, y: 10 })
  })
  it('leaves a point alone when nothing is close, or only a middle point is', () => {
    expect(snapPoint(topo, { x: 40, y: 62 }, 10)).toEqual({ x: 40, y: 62 })
    expect(snapPoint(topo, { x: 70, y: 70 }, 10)).toEqual({ x: 70, y: 70 })
  })
})
