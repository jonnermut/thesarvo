import type { Editor } from '#/auth/verifyToken'
import type { Guide } from '#/guide/model/types'
import { diffGuides, isEmpty, mergeChanges } from './changes'
import type { Changes, Conflict } from './changes'
import { describe, updateHistory } from './history'
import type { GuideRepo } from './repo'
import type { SaveRequest } from './validate'

export type SaveResult =
  /** Saved (or nothing left to save). `rename`: ids the server gave this save's new nodes, which clashed with others'. */
  | { status: 'saved'; head: string; guide: Guide; rename: Record<string, string>; at?: string }
  /** Someone else changed these nodes too; nothing was saved. */
  | { status: 'conflict'; head: string; guide: Guide; conflicts: Conflict[] }
  | { status: 'missing' }

const ATTEMPTS = 5

export const editorName = (e: Pick<Editor, 'name' | 'email'>) => e.name || e.email.split('@')[0] || 'Someone'

/** "Bruny Island: Jon edited the climb Albatros", then trailers that tie the commit to its session and editor. */
export function commitMessage(guide: Guide, changes: Changes, who: { sub: string; name: string }, session: string) {
  const header = guide.nodes.find((n) => n.type === 'header')
  const nodes = Object.fromEntries(changes.nodes.map((c) => [c.id, c]))
  const headline = `${header?.name.trim() || `Guide ${guide.id}`}: ${who.name} ${describe(nodes, changes.order, changes.guideStars)}`
  const body = [`Edit-Session: ${session}`, `Edit-User: ${who.name} <${who.sub}>`, `Edit-Nodes: ${changes.nodes.map((c) => c.id).join(' ')}`].join('\n')
  return { headline, body }
}

/**
 * Saves one batch of an editor's changes: merges them into the guide as it is now, folds them into the session's
 * history entry and commits both. Retries when someone committed in between; commits nothing on a conflict.
 */
export async function saveGuide(repo: GuideRepo, editor: Editor, request: SaveRequest, now = () => new Date()): Promise<SaveResult> {
  const who = { sub: editor.sub, name: editorName(editor) }
  for (let attempt = 1; ; attempt++) {
    const stored = await repo.read(request.guide)
    if (!stored) return { status: 'missing' }
    const merged = mergeChanges(stored.guide, request.changes)
    if (merged.conflicts.length) return { status: 'conflict', head: stored.head, guide: stored.guide, conflicts: merged.conflicts }
    const applied = diffGuides(stored.guide, merged.guide)
    if (isEmpty(applied)) return { status: 'saved', head: stored.head, guide: stored.guide, rename: merged.rename }
    const history = updateHistory(stored.history, { session: request.session, user: who, at: now().toISOString(), changes: applied, guide: merged.guide, note: request.note })
    const message = commitMessage(merged.guide, applied, who, request.session)
    const head = await repo.commit({ id: request.guide, head: stored.head, guide: merged.guide, history, message })
    if (head) return { status: 'saved', head, guide: merged.guide, rename: merged.rename, at: now().toISOString() }
    if (attempt === ATTEMPTS) throw new Error('The guide is busy: too many saves at once')
  }
}
