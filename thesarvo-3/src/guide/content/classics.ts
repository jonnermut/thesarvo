import { guideShard } from '#/guide/search/shard'
import { flatten } from './paths'
import type { ContentSource, IndexNode } from './types'

/** A three-star climb or problem, for the home page: where it is (`path` and `anchor` make the link) and what it is. */
export type Classic = { path: string; guide: string; anchor: string; name: string; grade: string; sport: boolean }

/** What the build writes to `g-data/classics.json`, and the dev server answers with: from the public source, so private pages never appear. */
export async function siteClassics(source: Pick<ContentSource, 'getGuide'>, index: IndexNode): Promise<Classic[]> {
  const found = await Promise.all(
    flatten(index)
      .filter((n) => n.isGuide)
      .map(async (node) => {
        const guide = await source.getGuide(node.id)
        if (!guide) return []
        return guideShard(guide).e.flatMap((e): Classic[] => (e[0] === 'h' || e[4] < 3 ? [] : [{ path: node.path, guide: node.title, anchor: e[1], name: e[2], grade: e[3], sport: e[5] === 1 }]))
      }),
  )
  return found.flat()
}
