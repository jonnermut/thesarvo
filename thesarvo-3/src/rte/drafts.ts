/** Text not saved yet, kept in the browser until it is. `base` is what the text started from, so a draft of something that has since changed is not offered. */
export type RichDraft = { html: string; title?: string; base: string; savedAt: number }

const key = (k: string) => `thesarvo.rte.${k}`

export function loadRichDraft(k: string, base: string): RichDraft | null {
  try {
    const raw = localStorage.getItem(key(k))
    const d = raw ? (JSON.parse(raw) as RichDraft) : null
    return d && d.base === base ? d : null
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
