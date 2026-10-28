import { currentUser, getIdToken } from '#/auth/session'
import type { PrivatePage } from './content/privatePage'
import { GUIDE_PREFIX, registerImages } from './content/paths'
import type { Graft } from './content/privateSite'

/**
 * The browser's side of private pages (src/guide/content/access.ts): who may read what is decided by the API from the
 * signed-in user's ID token. Signed out, or on the server (where there is no token), there is nothing private.
 */

const inBrowser = () => typeof window !== 'undefined' && !import.meta.env.SSR

async function authed<T>(path: string): Promise<T> {
  const token = await getIdToken()
  if (!token) throw new Error('Please sign in')
  const res = await fetch(`${GUIDE_PREFIX}/api/${path}`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `${res.status} ${path}`)
  return (await res.json()) as T
}

let grafts: { sub: string; promise: Promise<Graft[]> } | undefined
const privateIds = new Set<string>()

const idsOf = (g: Graft) => {
  const walk = (n: Graft['node']): string[] => [n.id, ...n.children.flatMap(walk)]
  return walk(g.node)
}

/** The private pages the signed-in user may read, to graft onto the tree; empty when signed out or if the API cannot be reached. Once per visit. */
export function fetchGrafts(): Promise<Graft[]> {
  const user = inBrowser() ? currentUser() : null
  if (!user) return Promise.resolve([])
  if (grafts?.sub !== user.sub) {
    grafts = {
      sub: user.sub,
      promise: authed<Graft[]>('private-tree').then(
        (list) => (list.flatMap(idsOf).forEach((id) => privateIds.add(id)), list),
        () => [],
      ),
    }
  }
  return grafts.promise
}

/** Is this page private (and so read through the private API)? Known once `fetchGrafts` has run. */
export const isPrivateId = (id: string) => privateIds.has(id)

const pages = new Map<string, { at: number; promise: Promise<PrivatePage> }>()
const FRESH_MS = 30_000

/** A private page's data; its photo links are registered for `imageUrl`. Shared for a few seconds, since a page's guide, history and photos all come from it. */
export function fetchPrivatePage(id: string): Promise<PrivatePage> {
  const known = pages.get(id)
  if (known && Date.now() - known.at < FRESH_MS) return known.promise
  const promise = authed<PrivatePage>(`private?id=${encodeURIComponent(id)}`).then((page) => (registerImages(id, page.images), page))
  pages.set(id, { at: Date.now(), promise })
  promise.catch(() => pages.delete(id))
  return promise
}
