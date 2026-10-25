import { describe, expect, it } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { addPath, insertPointAfter, movePoint, removePoint, toggleLegend } from './topoOps'

const empty: ImageTopo = {
  type: 'image', id: '1', src: 'a.jpg', width: 100, height: 100, noPrint: false, printLayout: '',
  legendTitle: '', legendFooter: '', legendX: 0, legendY: 0, legend: [], paths: [], rects: [], otherShapes: [], other: {},
}
const pt = (x: number, y: number) => ({ x, y, kind: '' })

describe('topo ops', () => {
  const topo = addPath(empty, 'p1', [pt(0, 0), pt(10, 10), pt(20, 0)], 'c1')

  it('creates a route with generated path data', () => {
    expect(topo.paths[0]).toMatchObject({ id: 'p1', linkedTo: 'c1', lineStyle: 'solid' })
    expect(topo.paths[0]!.d).toMatch(/^M0,0C/)
  })

  it('moving a point regenerates the path data', () => {
    const moved = movePoint(topo, 'p1', 1, { x: 50, y: 50 })
    expect(moved.paths[0]!.points[1]).toMatchObject({ x: 50, y: 50 })
    expect(moved.paths[0]!.d).not.toBe(topo.paths[0]!.d)
  })

  it('inserts a point halfway to the next one', () => {
    expect(insertPointAfter(topo, 'p1', 0).paths[0]!.points[1]).toMatchObject({ x: 5, y: 5 })
  })

  it('drops a route when fewer than two points would remain', () => {
    const two = addPath(empty, 'p2', [pt(0, 0), pt(1, 1)])
    expect(removePoint(two, 'p2', 0).paths).toHaveLength(0)
    expect(removePoint(topo, 'p1', 1).paths[0]!.points).toHaveLength(2)
  })

  it('toggles legend entries in tick order', () => {
    const t = toggleLegend(toggleLegend(empty, 'b'), 'a')
    expect(t.legend).toEqual(['b', 'a'])
    expect(toggleLegend(t, 'b').legend).toEqual(['a'])
  })
})
