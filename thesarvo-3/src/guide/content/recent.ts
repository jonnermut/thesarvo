import type { HistoryEntry } from '#/guide/save/history'
import type { ContentSource, IndexNode } from './types'
import { flatten } from './paths'

/** One line of "What's new": a page's latest change. `name` is empty when the editor is not known. */
export type RecentChange = { id: string; path: string; title: string; session: string; name: string; at: string; description: string }

export const RECENT_LIMIT = 20

/** Entries that are not an edit anyone made: the sum of old Confluence edits, and versions the import could not read. */
const isEdit = (e: HistoryEntry) => e.user.name !== 'Earlier editors' && !e.description.includes('could not be read')

/** The latest change to each page, newest first. A page's changes are its `history`, newest last. */
export function recentChanges(pages: { node: Pick<IndexNode, 'id' | 'path' | 'title'>; history: HistoryEntry[] }[], limit = RECENT_LIMIT): RecentChange[] {
  return pages
    .flatMap(({ node, history }) => {
      const e = history.findLast(isEdit)
      return e ? [{ id: node.id, path: node.path, title: node.title, session: e.session, name: e.user.name === 'Unknown' ? '' : e.user.name, at: e.end, description: e.description }] : []
    })
    .toSorted((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}

/** What the build writes to `g-data/recent.json`, and the dev server answers with: from the public source, so private pages never appear. */
export async function siteRecent(source: Pick<ContentSource, 'getHistory'>, index: IndexNode): Promise<RecentChange[]> {
  const guides = flatten(index).filter((n) => n.isGuide)
  return recentChanges(await Promise.all(guides.map(async (node) => ({ node, history: await source.getHistory(node.id) }))))
}
