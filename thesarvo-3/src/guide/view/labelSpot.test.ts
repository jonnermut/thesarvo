import { describe, expect, it } from 'vitest'
import type { RoutePath } from '#/guide/model/types'
import { labelSpots } from './labelSpot'

const path = (id: string, ...xy: [number, number, string?][]): RoutePath => ({
  id,
  points: xy.map(([x, y, kind = '']) => ({ x, y, kind })),
  d: '',
  linkedTo: '',
  lineStyle: 'solid',
  labelText: '',
  arrow: false,
})

describe('labelSpots', () => {
  it('puts a lone marker a circle below its point, like the live Bumblebee topo', () => {
    expect(labelSpots([path('26', [260, 300])], 300, 400).get('26')).toEqual({ x: 260, y: 322 })
  })
  it('puts the number beside a route that sets off sideways, away from the line (Bulgy)', () => {
    expect(labelSpots([path('6', [341, 419], [340, 419], [214, 246])], 500, 664).get('6')).toEqual({ x: 354, y: 419 })
    expect(labelSpots([path('r', [100, 100], [150, 101])], 500, 500).get('r')).toEqual({ x: 87, y: 100 })
  })
  it('puts it below a route heading up and above one heading down', () => {
    expect(labelSpots([path('up', [100, 300], [102, 200])], 500, 500).get('up')).toEqual({ x: 100, y: 313 })
    expect(labelSpots([path('down', [100, 100], [102, 200])], 500, 500).get('down')).toEqual({ x: 100, y: 87 })
  })
  it('fans out routes sharing a start', () => {
    const spots = labelSpots([path('a', [100, 300], [90, 200]), path('b', [100, 300], [110, 200])], 500, 500)
    expect(spots.get('a')).toEqual({ x: 100, y: 313 })
    expect(spots.get('b')).toEqual({ x: 122, y: 313 })
  })
  it('keeps numbers inside the photo, and uses a label point after the start as given', () => {
    expect(labelSpots([path('edge', [5, 395])], 300, 400).get('edge')).toEqual({ x: 11, y: 389 })
    expect(labelSpots([path('l', [100, 300], [100, 250, 'label'], [100, 100])], 500, 500).get('l')).toEqual({ x: 100, y: 250 })
  })
})
