import { useEffect, useState } from 'react'
import { GUIDE_PREFIX, STATIC_SITE } from './content/paths'
import type { Guide } from './model/types'

/**
 * A save is published by the site's build about 15 seconds later, so for that long the static page and its data still show the
 * guide as it was. The browser that saved remembers what it saved and shows that until the published build includes it.
 */
export type JustSaved = { guide: Guide; at: string }

const KEY = 'thesarvo.justSaved'
/** A build that never includes the save (a failed run) must not pin the old copy forever. */
const KEEP_MS = 10 * 60_000

const read = (): Record<string, JustSaved> => {
  try {
    const all: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return all && typeof all === 'object' ? (all as Record<string, JustSaved>) : {}
  } catch {
    return {}
  }
}

const write = (all: Record<string, JustSaved>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable or full: the page shows the published copy */
  }
}

/** `at` is the server's time for the save (ISO). */
export const rememberSaved = (guide: Guide, at: string) => write({ ...read(), [guide.id]: { guide, at } })

const forget = (id: string) => {
  const { [id]: _, ...rest } = read()
  write(rest)
}

/** True when a build made from content committed at `contentAt` includes a save made at `at`. A build without a time is taken as including it. */
export const includesSave = (contentAt: string | undefined, at: string) => !contentAt || Date.parse(contentAt) >= Date.parse(at)

export const expired = (saved: JustSaved, now = Date.now()) => now - Date.parse(saved.at) > KEEP_MS

/** The guide to show: this browser's last save of it while the published copy is older, else `guide` itself. */
export function useJustSaved(guide: Guide | null): Guide | null {
  const [saved, setSaved] = useState<Guide | null>(null)
  useEffect(() => {
    setSaved(null)
    const mine = STATIC_SITE && guide ? read()[guide.id] : undefined
    if (!guide || !mine) return
    if (expired(mine)) return forget(guide.id)
    let cancelled = false
    fetch(`${GUIDE_PREFIX}-data/build.json`, { cache: 'no-cache' })
      .then((res) => res.json() as Promise<{ contentAt?: string }>)
      .then((build) => {
        if (cancelled) return
        if (includesSave(build.contentAt, mine.at)) forget(guide.id)
        else setSaved(mine.guide)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [guide])
  return saved && saved.id === guide?.id ? saved : guide
}
