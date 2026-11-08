/** Text not saved yet, kept in the browser until it is. `base` is what the text started from: a draft of something that has since changed (`stale`) is not put in the editor unasked. */
export type RichDraft = { html: string; title?: string; base: string; savedAt: number }
export type LoadedDraft = RichDraft & { stale: boolean }

const key = (k: string) => `thesarvo.rte.${k}`

export function loadRichDraft(k: string, base: string): LoadedDraft | null {
  try {
    const raw = localStorage.getItem(key(k))
    const d = raw ? (JSON.parse(raw) as RichDraft) : null
    return d && { ...d, stale: d.base !== base }
  } catch {
    return null
  }
}

export function saveRichDraft(k: string, d: Omit<RichDraft, 'savedAt'>) {
  try {
    localStorage.setItem(key(k), JSON.stringify({ ...d, savedAt: Date.now() } satisfies RichDraft))
  } catch {
    /* quota or privacy mode: it just isn't remembered */
  }
}

export function clearRichDraft(k: string) {
  try {
    localStorage.removeItem(key(k))
  } catch {
    /* ignore */
  }
}
