import { describe, expect, it } from 'vitest'
import { markerPoints } from './markers'

const pt = (x: number, kind = '') => ({ x, y: x, kind })

describe('markerPoints', () => {
  it('keeps mid-route belays and lower-offs as well as the last point', () => {
    const points = [pt(1), pt(2, 'belay'), pt(3), pt(4, 'lower'), pt(5, 'label'), pt(6, 'lower-right')]
    expect(markerPoints(points).map((p) => p.x)).toEqual([2, 4, 6])
  })

  it('is empty for a plain route', () => {
    expect(markerPoints([pt(1), pt(2, 'label'), pt(3)])).toEqual([])
  })
})
