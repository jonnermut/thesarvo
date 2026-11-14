import type { HistoryEntry } from '#/guide/save/history'
import type { ContentSource, IndexNode } from './types'
import { flatten } from './paths'

/** One line of "What's new": a page's latest change. `name` is empty when the editor is not known. `guides` marks a run over many guides (a `batch` entry), shown as one line with no page. */
export type RecentChange = { id: string; path: string; title: string; session: string; sub: string; key?: string; name: string; at: string; description: string; guides?: number }

export const RECENT_LIMIT = 20

/** Entries that are not an edit anyone made: the sum of old Confluence edits, and versions the import could not read. */
const isEdit = (e: HistoryEntry) => e.user.name !== 'Earlier editors' && !e.description.includes('could not be read')

/** The latest change to each page, newest first. A page's changes are its `history`, newest last. A batch run (a bot's copy-edit of many guides) is one line of its own, "fixed up 240 guides", counting every guide it changed; it never hides a page's latest change by a person, so each page shows its latest edit outside batch runs. */
export function recentChanges(pages: { node: Pick<IndexNode, 'id' | 'path' | 'title'>; history: HistoryEntry[] }[], limit = RECENT_LIMIT): RecentChange[] {
  const line = (node: Pick<IndexNode, 'id' | 'path' | 'title'>, e: HistoryEntry): RecentChange => ({ id: node.id, path: node.path, title: node.title, session: e.session, sub: e.user.sub, ...(e.user.key && { key: e.user.key }), name: e.user.name === 'Unknown' ? '' : e.user.name, at: e.end, description: e.description })
  const runs = new Map<string, RecentChange & { guides: number }>()
  const changes = pages.flatMap(({ node, history }): RecentChange[] => {
    for (const e of new Map(history.filter((h) => h.batch && isEdit(h)).map((h) => [h.session, h])).values()) {
      const run = runs.get(e.session)
      const guides = (run?.guides ?? 0) + 1
      runs.set(e.session, { ...line(node, e), id: `batch:${e.session}`, path: '', title: '', at: run && run.at > e.end ? run.at : e.end, description: (e.batch ?? '').replace('{n}', String(guides)), guides })
    }
    const e = history.findLast((h) => !h.batch && isEdit(h))
    return e ? [line(node, e)] : []
  })
  return [...changes, ...runs.values()].toSorted((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

/** What the build writes to `g-data/recent.json`, and the dev server answers with: from the public source, so private pages never appear. */
export async function siteRecent(source: Pick<ContentSource, 'getHistory'>, index: IndexNode): Promise<RecentChange[]> {
  const guides = flatten(index).filter((n) => n.isGuide)
  return recentChanges(await Promise.all(guides.map(async (node) => ({ node, history: await source.getHistory(node.id) }))))
}
