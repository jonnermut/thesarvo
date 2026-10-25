import { describe, expect, it } from 'vitest'
import { parseGpx } from './NodeForms'

describe('parseGpx', () => {
  it('reads waypoints with name, elevation and UTM filled in', () => {
    const [p] = parseGpx(
      '<gpx><wpt lat="-42.8826" lon="147.3257"><ele>12</ele><name>Car park</name></wpt></gpx>',
    )
    expect(p).toMatchObject({ description: 'Car park', height: '12', latitude: '-42.8826', zone: '55G' })
    expect(Number(p?.easting)).toBeGreaterThan(500000)
  })
})
