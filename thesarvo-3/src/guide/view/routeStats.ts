import type { Climb } from '#/guide/model/types'

export const GRADE_BANDS = ['<16', '16-19', '20-24', '25+'] as const
export type Band = (typeof GRADE_BANDS)[number]

export type RouteStats = {
  total: number
  /** Counts per grade band, in `GRADE_BANDS` order. */
  bands: { band: Band; trad: number; sport: number }[]
}

const bandOf = (grade: number): Band => (grade < 16 ? '<16' : grade < 20 ? '16-19' : grade < 25 ? '20-24' : '25+')

/** Route counts by Ewbank grade band for the guide's summary chart. Boulder problems are not counted. */
export function routeStats(climbs: Climb[]): RouteStats {
  const bands = GRADE_BANDS.map((band) => ({ band, trad: 0, sport: 0 }))
  let total = 0
  for (const c of climbs) {
    const grade = Number.parseInt(c.grade, 10)
    if (c.type !== 'climb' || Number.isNaN(grade)) continue
    const entry = bands.find((b) => b.band === bandOf(grade))
    if (!entry) continue
    if (/sport/i.test(c.extra)) entry.sport++
    else entry.trad++
    total++
  }
  return { total, bands }
}
