import type { Guide } from '#/guide/model/types'

export type Draft = {
  guide: Guide
  /** Fingerprint of the published content the draft was started from. */
  base: string
  savedAt: number
}

/**
 * Where edits go. Today: the browser only. The backend plan adds a server-backed
 * implementation (publish = commit to the content repo) behind the same shape.
 */
export interface GuideStore {
  loadDraft: (guideId: string) => Draft | null
  saveDraft: (guideId: string, guide: Guide, base: string) => void
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

/** Cheap stable fingerprint (FNV-1a) of a guide, to tell whether content changed under a draft. */
export function fingerprint(guide: Guide): string {
  const s = JSON.stringify(guide)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16)
}
