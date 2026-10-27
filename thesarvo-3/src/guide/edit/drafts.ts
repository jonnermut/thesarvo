import type { Guide } from '#/guide/model/types'

export type Draft = {
  guide: Guide
  /** The guide as last saved when the draft was written, so the draft's changes can be saved on top of it. A string
   * (a fingerprint) in drafts from before saving existed. */
  base: Guide | string
  savedAt: number
}

/** Edits not saved yet, kept in the browser until they are (see `saver.ts`). */
export interface GuideStore {
  loadDraft: (guideId: string) => Draft | null
  saveDraft: (guideId: string, guide: Guide, base: Guide) => void
  clearDraft: (guideId: string) => void
}

const key = (guideId: string) => `thesarvo.draft.${guideId}`

/** Drafts in localStorage, so work survives reloads. Storage can be missing or full; then we just don't persist. */
export const localStore: GuideStore = {
  loadDraft(guideId) {
    try {
      const raw = localStorage.getItem(key(guideId))
      return raw ? (JSON.parse(raw) as Draft) : null
    } catch {
      return null
    }
  },
  saveDraft(guideId, guide, base) {
    try {
      localStorage.setItem(key(guideId), JSON.stringify({ guide, base, savedAt: Date.now() } satisfies Draft))
    } catch {
      /* quota or privacy mode: editing still works, it just isn't remembered */
    }
  },
  clearDraft(guideId) {
    try {
      localStorage.removeItem(key(guideId))
    } catch {
      /* ignore */
    }
  },
}
