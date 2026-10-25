import { createServerFn } from '@tanstack/react-start'
import { manifestTree, pageInfo } from './content/manifest'
import { resolvePageBody } from './content/pageLinks'
import type { Manifest, PageInfo } from './content/manifest'
import { STATIC_SITE, GUIDE_PREFIX } from './content/paths'
import type { ContentSource, IndexNode } from './content/types'
import type { Guide } from './model/types'

const serverManifest = createServerFn({ method: 'GET' }).handler(async () => (await import('./content/siteManifest')).siteManifest())

const serverGuide = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getGuide(id))

const serverPageBody = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getPageBody(id))

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

export async function fetchTree(): Promise<IndexNode> {
  const manifest = await fetchManifest()
  const tree = trees.get(manifest) ?? manifestTree(manifest)
  trees.set(manifest, tree)
  return tree
}

/** A page's node, trail and trimmed tree, or null if there is no such page. */
export const fetchPage = async (path: string): Promise<PageInfo | null> => pageInfo(await fetchTree(), path)

export const fetchGuide = ({ data: id }: { data: string }): Promise<Guide | null> =>
  STATIC_SITE ? staticData(`guide/${id}.json`, (s) => s.getGuide(id)) : serverGuide({ data: id })

/** The body of a page that is not a guide, with its links pointing at the current site, or null. */
export async function fetchPageBody(id: string): Promise<string | null> {
  const body = await (STATIC_SITE ? staticData(`page/${id}.json`, (s) => s.getPageBody(id)) : serverPageBody({ data: id }))
  return body && resolvePageBody(body, await fetchTree(), id)
}

export const fetchImageNames = ({ data: id }: { data: string }): Promise<string[]> =>
  STATIC_SITE ? staticData(`images/${id}.json`, (s) => s.listImages(id)) : serverImageNames({ data: id })
