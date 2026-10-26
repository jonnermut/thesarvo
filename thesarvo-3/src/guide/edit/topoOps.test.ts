import { describe, expect, it } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { addPath, addRect, insertPointAfter, movePoint, removePoint, resize, setPointKind, toggleLegend } from './topoOps'

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
