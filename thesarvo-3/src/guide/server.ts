import { createServerFn } from '@tanstack/react-start'
import { manifestTree, pageInfo } from './content/manifest'
import { resolvePageBody } from './content/pageLinks'
import type { Manifest, PageInfo } from './content/manifest'
import type { Classic } from './content/classics'
import type { RecentChange } from './content/recent'
import { STATIC_SITE, GUIDE_PREFIX } from './content/paths'
import type { ContentSource, IndexNode } from './content/types'
import { fetchGrafts, fetchPrivatePage, isPrivateId } from './privateClient'
import { withGrafts } from './content/privateSite'
import { mergeShards } from './search/shard'
import type { Pack, Shard } from './search/shard'
import type { Guide } from './model/types'
import type { HistoryEntry } from './save/history'

const serverManifest = createServerFn({ method: 'GET' }).handler(async () => (await import('./content/siteManifest')).siteManifest())

const serverGuide = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getGuide(id))

const serverPageBody = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getPageBody(id))

const serverRecent = createServerFn({ method: 'GET' }).handler(async () => {
  const source = (await import('./content')).getContentSource()
  return (await import('./content/recent')).siteRecent(source, await source.getIndex())
})

const serverClassics = createServerFn({ method: 'GET' }).handler(async () => {
  const source = (await import('./content')).getContentSource()
  return (await import('./content/classics')).siteClassics(source, await source.getIndex())
})

const serverSearchShards = createServerFn({ method: 'GET' }).handler(async () => (await import('./search/allShards')).allShards())

const serverHistory = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getHistory(id))

const serverImageNames = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().listImages(id))

/**
 * The static site has no server: pages are rendered at build time from the content folder, and
 * the browser reads the same data as plain files under /g-data (written by `npm run build-site`).
 */
async function staticData<T>(file: string, fromDisk: (source: ContentSource) => Promise<T>): Promise<T> {
  if (import.meta.env.SSR) return fromDisk((await import('./content/staticSource')).staticSource())
  return getJson<T>(file)
}

async function getJson<T>(file: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GUIDE_PREFIX}-data/${file}`, init)
  if (!res.ok) throw new Error(`${res.status} ${file}`)
  return (await res.json()) as T
}

let browserManifest: Promise<Manifest> | undefined
const trees = new WeakMap<Manifest, IndexNode>()

/**
 * The whole site's tree and stats. The browser fetches it once per visit, always fresh
 * (`no-cache`), so pages built earlier still show the current tree.
 */
export function fetchManifest(): Promise<Manifest> {
  if (import.meta.env.SSR) return import('./content/siteManifest').then((m) => m.siteManifest())
  browserManifest ??= (STATIC_SITE ? getJson<Manifest>('manifest.json', { cache: 'no-cache' }) : serverManifest()).catch((e: unknown) => {
    browserManifest = undefined
    throw e
  })
  return browserManifest
}

const treeListeners = new Set<() => void>()

/** Runs `listener` when the tree is fetched again (see `refreshManifest`); returns how to stop. */
export function onTreeChange(listener: () => void): () => void {
  treeListeners.add(listener)
  return () => void treeListeners.delete(listener)
}

/** Forgets the fetched manifest, so the next read is fresh (a page was added), and by default tells whoever shows the tree. */
export function refreshManifest(notify = true): void {
  browserManifest = undefined
  if (notify) treeListeners.forEach((l) => l())
}

const merged = new WeakMap<IndexNode, WeakMap<object, IndexNode>>()

/** The tree, with the private pages the signed-in user may read grafted in. */
export async function fetchTree(): Promise<IndexNode> {
  const manifest = await fetchManifest()
  const tree = trees.get(manifest) ?? manifestTree(manifest)
  trees.set(manifest, tree)
  const grafts = await fetchGrafts()
  if (!grafts.length) return tree
  // Stable between calls, since components compare trees to know when to update.
  const byGrafts = merged.get(tree) ?? new WeakMap<object, IndexNode>()
  merged.set(tree, byGrafts)
  const known = byGrafts.get(grafts) ?? withGrafts(tree, grafts)
  byGrafts.set(grafts, known)
  return known
}

/** A page's node, trail and trimmed tree, or null if there is no such page. */
export const fetchPage = async (path: string): Promise<PageInfo | null> => pageInfo(await fetchTree(), path)

export const fetchGuide = ({ data: id }: { data: string }): Promise<Guide | null> =>
  isPrivateId(id) ? fetchPrivatePage(id).then((p) => p.guide) : STATIC_SITE ? staticData(`guide/${id}.json`, (s) => s.getGuide(id)) : serverGuide({ data: id })

/**
 * A page's edit sessions, newest last. The static site has a file only for pages with history, written at build
 * time like the page, so it is as current as the page itself.
 */
export const fetchHistory = async (id: string): Promise<HistoryEntry[]> => {
  if (isPrivateId(id)) return (await fetchPrivatePage(id)).history
  if (!STATIC_SITE) return serverHistory({ data: id })
  const res = await fetch(`${GUIDE_PREFIX}-data/history/${id}.json`, { cache: 'no-cache' })
  return res.ok ? ((await res.json()) as HistoryEntry[]) : []
}

/** The body of a page that is not a guide, with its links pointing at the current site, or null. */
export async function fetchPageBody(id: string): Promise<string | null> {
  const body = await (isPrivateId(id) ? fetchPrivatePage(id).then((p) => p.body) : STATIC_SITE ? staticData(`page/${id}.json`, (s) => s.getPageBody(id)) : serverPageBody({ data: id }))
  return body && resolvePageBody(body, await fetchTree(), id)
}

/** Every guide's search entries. The static site reads the pack and overrides its manifest lists, all cached for good. */
export async function fetchSearchShards(): Promise<Shard[]> {
  if (!STATIC_SITE) return serverSearchShards()
  const { search } = await fetchManifest()
  if (!search) return []
  const [pack, overrides] = await Promise.all([
    getJson<Pack>(`search/${search.pack}`),
    Promise.all(Object.values(search.shards).map((file) => getJson<Shard>(`search/${file}`))),
  ])
  return mergeShards(pack, overrides, search.removed)
}

/** The three-star climbs, for the home page to pick from. */
export const fetchClassics = (): Promise<Classic[]> => (STATIC_SITE ? getJson<Classic[]>('classics.json', { cache: 'no-cache' }) : serverClassics())

/** The latest change to each of the most recently changed pages, for the home page. */
export const fetchRecent = (): Promise<RecentChange[]> => (STATIC_SITE ? getJson<RecentChange[]>('recent.json', { cache: 'no-cache' }) : serverRecent())

/** The static site's list holds the photos pages used at build time; the API adds later uploads when it is reachable. */
export const fetchImageNames = async ({ data: id }: { data: string }): Promise<string[]> => {
  if (isPrivateId(id)) return Object.keys((await fetchPrivatePage(id)).images).sort()
  if (!STATIC_SITE) return serverImageNames({ data: id })
  const [built, stored] = await Promise.all([
    staticData(`images/${id}.json`, (s) => s.listImages(id)),
    fetch(`${GUIDE_PREFIX}/api/images?guide=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
      .catch(() => []),
  ])
  return [...new Set([...built, ...stored])].sort()
}
