import type { Climb } from '#/guide/model/types'

export const ROUTE_BANDS = ['<16', '16-19', '20-24', '25+'] as const
export const PROBLEM_BANDS = ['VE-2', '3-5', '6-8', '9+'] as const

export type RouteStats = {
  /** Number of climbs (or problems) in the guide, whether or not they have a usable grade. */
  total: number
  /** True for bouldering guides: problem bands and no trad/sport split. */
  problems: boolean
  /** Counts per grade band, lowest first. */
  bands: { band: string; trad: number; sport: number }[]
}

/** Sport routes carry a bolt marker in `extra`: the legacy bolt glyph (char 222) or a count like "6B". */
export const isSport = (extra: string) => extra.includes('Þ') || /\d+B/.test(extra)

/** Mirrors the legacy GraphServlet: keeps the first number of grades like "17/18", "M5", "VE" or "A2". */
export function gradeNumber(grade: string): number | null {
  const first = (grade.split('/')[0] ?? '')
    .replace(/[?MAV]/g, ' ')
    .replace(/E/g, '0')
    .trim()
    .split(' ')[0]
  const n = Number.parseInt(first ?? '', 10)
  return Number.isNaN(n) ? null : n
}

const bandIndex = (grade: number, problems: boolean) =>
  problems ? (grade < 3 ? 0 : grade < 6 ? 1 : grade < 9 ? 2 : 3) : grade < 16 ? 0 : grade < 20 ? 1 : grade < 25 ? 2 : 3

/** Counts for the guide's summary chart. Like the legacy chart, a guide with more problems than climbs is a bouldering guide. */
export function routeStats(nodes: Climb[]): RouteStats {
  const climbs = nodes.filter((c) => c.type === 'climb')
  const boulders = nodes.filter((c) => c.type === 'problem')
  const problems = boulders.length > climbs.length
  const counted = problems ? boulders : climbs
  const bands = (problems ? PROBLEM_BANDS : ROUTE_BANDS).map((band) => ({ band, trad: 0, sport: 0 }))
  for (const c of counted) {
    const grade = gradeNumber(c.grade.trim())
    if (grade === null || grade < 0) continue
    const entry = bands[bandIndex(grade, problems)]
    if (!entry) continue
    if (!problems && isSport(c.extra.trim())) entry.sport++
    else entry.trad++
  }
  return { total: counted.length, problems, bands }
}
