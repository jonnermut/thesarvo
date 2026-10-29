import type { Classic, GuideStats } from '#/guide/content/manifest'
import { flatten } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'

/** How many classics a region keeps for its card to rotate through. */
const CARD_CLASSICS = 12

/** A region's guides added up, for a contents card. Classics name the guide each comes from. */
export type Rollup = Omit<GuideStats, 'classics' | 'pin' | 'gps'> & { classics: [IndexNode, Classic][]; guides: number }

/**
 * Adds up the guides below `node` of the kind most of them are (routes or problems, whose grade
 * bands differ). Classics take each guide's best in turn, so one big crag does not fill the list.
 * Undefined when nothing below has climbs.
 */
export function rollup(node: IndexNode, classics = CARD_CLASSICS): Rollup | undefined {
  const all = flatten(node).filter((n) => n.stats?.total)
  const problems = all.filter((n) => n.stats!.problems).length > all.length / 2
  const guides = all.filter((n) => n.stats!.problems === problems)
  if (!guides.length) return undefined
  const sum: Rollup = { total: 0, problems, bands: [], sport: 0, stars: [0, 0, 0], topos: 0, classics: [], guides: guides.length }
  for (const { stats: s } of guides) {
    sum.total += s!.total
    s!.bands.forEach((n, i) => (sum.bands[i] = (sum.bands[i] ?? 0) + n))
    sum.sport += s!.sport
    s!.stars.forEach((n, i) => (sum.stars[i] += n))
    sum.topos += s!.topos
  }
  // Round robin over the guides, best stars first.
  const queues = guides.map((g) => g.stats!.classics.map((c): [IndexNode, Classic] => [g, c]))
  for (let round = 0; sum.classics.length < classics && queues.some((q) => q.length > round); round++)
    for (const stars of [3, 2])
      for (const q of queues) if (q[round]?.[1][3] === stars && sum.classics.length < classics) sum.classics.push(q[round])
  return sum
}
