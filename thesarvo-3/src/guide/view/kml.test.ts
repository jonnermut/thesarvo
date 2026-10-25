import { describe, expect, it } from 'vitest'
import type { Gps } from '#/guide/model/types'
import { gpsToKml } from './kml'

const gps: Gps = {
  type: 'gps',
  id: '1',
  other: {},
  points: [{ pid: '0', code: 'A', description: 'Car & park', zone: '', easting: '', northing: '', latitude: '-42.1', longitude: '147.2', height: '' }],
  lines: [
    { shape: 'polyline', pid: '1', description: 'Track', path: '-42.1,147.1 -42.2,147.2' },
    { shape: 'rectangle', pid: '2', description: 'Box', path: '-42.1,147.1 -42.2,147.2' },
  ],
}

describe('gpsToKml', () => {
  it('writes lon,lat order and escapes names', () => {
    const kml = gpsToKml('Guide', gps)
    expect(kml).toContain('Car &amp; park')
    expect(kml).toContain('<coordinates>147.2,-42.1</coordinates>')
    expect(kml).toContain('147.1,-42.1 147.2,-42.2')
  })
  it('expands a rectangle to a closed ring', () => {
    expect(gpsToKml('Guide', gps)).toContain('147.1,-42.1 147.2,-42.1 147.2,-42.2 147.1,-42.2 147.1,-42.1')
  })
})
