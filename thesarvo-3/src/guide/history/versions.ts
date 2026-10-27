import type { Guide } from '#/guide/model/types'
import { mergeChanges } from '#/guide/save/changes'
import type { Changes } from '#/guide/save/changes'
import type { HistoryEntry } from '#/guide/save/history'

/** The changes that undo a session: each block back as it was before it. */
export const undoChanges = (e: HistoryEntry): Changes => ({
  nodes: Object.entries(e.nodes).map(([id, { before, after }]) => ({ id, before: after, after: before })),
  ...(e.order && { order: { before: e.order.after, after: e.order.before } }),
  ...(e.guideStars && { guideStars: { before: e.guideStars.after, after: e.guideStars.before } }),
})

/**
 * The guide as a session left it, worked out from the guide now by undoing every later session, newest first: the
 * history file holds each session's blocks before and after, so nothing else is needed. Changes made outside the
 * site's saves (Confluence, until cutover) stay in.
 */
export function versionAfter(current: Guide, history: HistoryEntry[], session: string): Guide | null {
  const at = history.findIndex((e) => e.session === session)
  if (at < 0) return null
  return history.slice(at + 1).reduceRight((guide, e) => mergeChanges(guide, undoChanges(e), true).guide, current)
}
