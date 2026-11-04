import { describe, expect, it } from 'vitest'
import { climb, climbOverContours, crossings, distance, formatDistance, pathLength, sample } from './measure'

describe('measure', () => {
  it('measures great-circle distance', () => {
    // One degree of latitude is about 111.2 km.
    expect(distance({ lat: -42, lng: 147 }, { lat: -43, lng: 147 })).toBeGreaterThan(111000)
    expect(distance({ lat: -42, lng: 147 }, { lat: -43, lng: 147 })).toBeLessThan(111500)
    expect(pathLength([{ lat: 0, lng: 0 }])).toBe(0)
  })

  it('samples evenly along a path, ends included', () => {
    const path = [{ lat: -42, lng: 147 }, { lat: -42.01, lng: 147 }, { lat: -42.01, lng: 147.01 }]
    const s = sample(path, 100)
    expect(s[0]).toEqual(path[0])
    expect(s[s.length - 1].lat).toBeCloseTo(-42.01, 6)
    expect(s[s.length - 1].lng).toBeCloseTo(147.01, 6)
    expect(s.length).toBeLessThanOrEqual(100)
    expect(sample(path, 1, 10)).toHaveLength(10)
    expect(sample([path[0]])).toEqual([path[0]])
  })

  it('totals climb and descent', () => {
    expect(climb([100, 150, 120, 130, 90])).toEqual({ up: 60, down: 70 })
    expect(climb([5])).toEqual({ up: 0, down: 0 })
  })

  it('formats distances', () => {
    expect(formatDistance(850.4)).toBe('850 m')
    expect(formatDistance(1840)).toBe('1.84 km')
    expect(formatDistance(12500)).toBe('12.5 km')
  })

  it('counts climb from the contours a path crosses, in order', () => {
    // A path running north along lng 147; contours are east-west lines every 0.001 degree of latitude (about 110 m).
    const path = [{ lat: -42, lng: 147 }, { lat: -42.005, lng: 147 }]
    const line = (lat: number, elevation: number) => ({ elevation, paths: [[[146.99, lat], [147.01, lat]]] })
    // Going south: 100, 110, 120 (up), then a ridge: 120 touched again lower, 110, 100.
    const contours = [line(-42.0005, 100), line(-42.0015, 110), line(-42.0025, 120), line(-42.0035, 110), line(-42.0045, 100)]
    const c = crossings(path, contours)
    expect(c.map((x) => x.elevation)).toEqual([100, 110, 120, 110, 100])
    expect(c[0].at).toBeCloseTo(55, -1)
    expect(climbOverContours(path, contours)).toEqual({ up: 20, down: 20 })
    expect(climbOverContours(path, [])).toEqual({ up: 0, down: 0 })
  })
})
