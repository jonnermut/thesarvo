import { useSyncExternalStore } from 'react'

/** A guide the reader opened, newest first, kept in this browser only. */
export type Recent = { path: string; title: string }

const KEY = 'thesarvo.recent'
const MAX = 6
const NONE: Recent[] = []
const listeners = new Set<() => void>()
let recent: Recent[] | undefined

function read(): Recent[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((r): r is Recent => typeof r?.path === 'string' && typeof r?.title === 'string') : []
  } catch {
    return []
  }
}

const current = () => (recent ??= read())

export function addRecent(entry: Recent) {
  recent = [entry, ...current().filter((r) => r.path !== entry.path)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(recent))
  } catch {
    /* storage unavailable: remembered for this visit only */
  }
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Recently viewed guides; empty on the server and in the first render, so pages hydrate cleanly. */
export const useRecent = () => useSyncExternalStore(subscribe, current, () => NONE)
