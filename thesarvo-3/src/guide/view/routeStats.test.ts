import { describe, expect, it } from 'vitest'
import type { Climb } from '#/guide/model/types'
import { routeStats } from './routeStats'

const climb = (grade: string, extra = '', type: Climb['type'] = 'climb') => ({ type, grade, extra }) as Climb

describe('routeStats', () => {
  it('buckets by grade band, splits sport (bolt glyph or "nB") from trad and counts ungraded routes in the total', () => {
    const stats = routeStats([climb('12'), climb('16'), climb('19', '6B'), climb('24', 'x\u00DE'), climb('26'), climb('17/18'), climb('M5'), climb('VE'), climb('')])
    expect(stats.total).toBe(9)
    expect(stats.problems).toBe(false)
    expect(stats.bands).toEqual([
      { band: '<16', trad: 3, sport: 0 },
      { band: '16-19', trad: 2, sport: 1 },
      { band: '20-24', trad: 0, sport: 1 },
      { band: '25+', trad: 1, sport: 0 },
    ])
  })

  it('treats a guide with more problems than climbs as bouldering', () => {
    const stats = routeStats([climb('V2', '', 'problem'), climb('4', '', 'problem'), climb('10', '', 'problem'), climb('20')])
    expect(stats).toMatchObject({ total: 3, problems: true })
    expect(stats.bands.map((b) => b.trad)).toEqual([1, 1, 0, 1])
  })
})
