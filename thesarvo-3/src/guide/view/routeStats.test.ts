import { describe, expect, it } from 'vitest'
import type { Climb } from '#/guide/model/types'
import { routeStats } from './routeStats'

const climb = (grade: string, extra = '', type: Climb['type'] = 'climb') => ({ type, grade, extra }) as Climb

describe('routeStats', () => {
  it('buckets by grade band, splits sport from trad and ignores boulder problems', () => {
    const stats = routeStats([climb('12'), climb('16'), climb('19', 'Sport'), climb('24'), climb('26'), climb('V3', '', 'problem'), climb('')])
    expect(stats.total).toBe(5)
    expect(stats.bands).toEqual([
      { band: '<16', trad: 1, sport: 0 },
      { band: '16-19', trad: 1, sport: 1 },
      { band: '20-24', trad: 1, sport: 0 },
      { band: '25+', trad: 1, sport: 0 },
    ])
  })
})
