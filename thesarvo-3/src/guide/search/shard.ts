import type { Guide } from '#/guide/model/types'
import { guideContents, nodeAnchors } from '#/guide/view/contents'
import { isSport } from '#/guide/view/routeStats'

/**
 * One thing search can find inside a guide, as a compact array: a heading (`h`), or a climb (`c`)
 * or problem (`p`) with its grade, star count and whether it is sport. The anchor is the deep link.
 */
export type SearchEntry = ['h', anchor: string, text: string] | ['c' | 'p', anchor: string, name: string, grade: string, stars: number, sport: 0 | 1]

/** Everything searchable in one guide. */
export type Shard = { g: string; e: SearchEntry[] }

/** Many guides' shards in one file. */
export type Pack = Shard[]

/**
 * Where the search data is, as the manifest lists it: one content-hashed pack of all guides, plus
 * shards for guides changed since the pack was written and the ids of guides deleted since.
 * Every file name carries a hash, so browsers cache them for good.
 */
export type SearchFiles = { pack: string; shards: Record<string, string>; removed: string[] }

/** The pack with changed guides replaced by their own shards and deleted ones dropped. */
export function mergeShards(pack: Pack, overrides: Shard[], removed: string[]): Shard[] {
  const replaced = new Set([...removed, ...overrides.map((s) => s.g)])
  return [...pack.filter((s) => !replaced.has(s.g)), ...overrides]
}

const starCount = (stars: string) => Math.min(stars.replace(/[^*]/g, '').length, 3)

/** Headings, GPS, climbs and problems, in guide order, as in the guide's own contents. */
export function guideShard(guide: Guide): Shard {
  const anchors = nodeAnchors(guide.nodes)
  const byAnchor = new Map(guide.nodes.map((n, i) => [anchors[i], n]))
  const e = guideContents(guide.nodes).flatMap((entry): SearchEntry[] => {
    const node = byAnchor.get(entry.anchor)
    if (node?.type === 'climb' || node?.type === 'problem')
      return [[node.type === 'climb' ? 'c' : 'p', entry.anchor, entry.text, node.grade.trim(), starCount(node.stars), node.type === 'climb' && isSport(node.extra) ? 1 : 0]]
    return entry.kind === 'intro' ? [] : [['h', entry.anchor, entry.text]]
  })
  return { g: guide.id, e }
}
