import { describe, expect, it } from 'vitest'
import { latLonToUtm, parseZone, utmToLatLon } from './utm'

describe('utm', () => {
  // Hobart GPO, checked against published GDA94 / MGA zone 55 values.
  const hobart = { lat: -42.8821, lon: 147.3272 }

  it('puts Hobart in zone 55G at a plausible position', () => {
    const u = latLonToUtm(hobart)
    expect(u.zone).toBe(55)
    expect(u.band).toBe('G')
    expect(u.easting).toBeGreaterThan(520000)
    expect(u.easting).toBeLessThan(540000)
    expect(u.northing).toBeGreaterThan(5250000)
    expect(u.northing).toBeLessThan(5260000)
  })

  it('matches a point from the Lowdina guide', () => {
    const u = latLonToUtm({ lat: -42.63225, lon: 147.42777 })
    expect(Math.abs(u.easting - 535074)).toBeLessThan(2)
    expect(Math.abs(u.northing - 5279933)).toBeLessThan(2)
  })

  it('round-trips to well under a metre', () => {
    const back = utmToLatLon(latLonToUtm(hobart))
    expect(back.lat).toBeCloseTo(hobart.lat, 6)
    expect(back.lon).toBeCloseTo(hobart.lon, 6)
  })

  it('parses zone strings', () => {
    expect(parseZone('55G')).toEqual({ zone: 55, band: 'G' })
    expect(parseZone('nonsense')).toBeUndefined()
  })
})
