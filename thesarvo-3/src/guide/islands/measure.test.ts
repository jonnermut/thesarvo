import { describe, expect, it } from 'vitest'
import { climb, distance, formatDistance, pathLength, sample } from './measure'

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
})
