import { useEffect, useReducer, useState } from 'react'
import type { Guide } from '#/guide/model/types'
import { ensureIds, same } from '#/guide/save/changes'
import { localStore } from './drafts'
import type { Draft } from './drafts'
import type { Action } from './state'
import { Saver } from './saver'

const DRAFT_DELAY_MS = 400

/**
 * Saves the editor's guide as it changes (see `Saver`) and keeps a draft of anything not saved yet in this browser.
 * `ready` once the latest version is loaded; `pendingDraft` is a draft an earlier visit left, to restore or drop.
 */
export function useSaver(published: Guide, present: Guide, dispatch: (a: Action) => void) {
  const [, changed] = useReducer((n: number) => n + 1, 0)
  const [saver] = useState(() => new Saver(published.id, { rebase: (guide) => dispatch({ type: 'rebase', guide }), changed }))
  const [ready, setReady] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null)

  useEffect(() => {
    let live = true
    void saver.load(published).then((latest) => {
      if (!live) return
      dispatch({ type: 'rebase', guide: latest })
      const draft = localStore.loadDraft(published.id)
      if (draft && !same(draft.guide, latest)) setPendingDraft(draft)
      else localStore.clearDraft(published.id)
      setReady(true)
    })
    return () => {
      live = false
      saver.stop()
    }
  }, [saver, published, dispatch])

  useEffect(() => {
    if (ready && !pendingDraft) saver.update(present)
  }, [saver, present, ready, pendingDraft])

  // The draft follows what is not saved yet, and goes once everything is.
  const unsaved = ready && !pendingDraft && saver.hasUnsaved()
  useEffect(() => {
    if (!ready || pendingDraft) return
    const timer = setTimeout(() => {
      if (unsaved && saver.saved) localStore.saveDraft(published.id, present, saver.saved)
      else localStore.clearDraft(published.id)
    }, DRAFT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [saver, present, ready, pendingDraft, unsaved, published.id])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saver.hasUnsaved() && saver.status.kind !== 'unavailable') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('online', saver.retry)
    return () => {
      window.removeEventListener('beforeunload', warn)
      window.removeEventListener('online', saver.retry)
    }
  }, [saver])

  const restoreDraft = (keep: boolean) => {
    if (pendingDraft && keep) {
      // Drafts from before saving existed have no base guide: their changes go on top of the latest.
      if (typeof pendingDraft.base === 'object') saver.restore(pendingDraft.base)
      dispatch({ type: 'replace', guide: typeof pendingDraft.base === 'object' ? pendingDraft.guide : ensureIds(pendingDraft.guide) })
    } else localStore.clearDraft(published.id)
    setPendingDraft(null)
  }

  return { saver, ready, pendingDraft, restoreDraft }
}
