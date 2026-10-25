import { createServerFn } from '@tanstack/react-start'
import { STATIC_SITE, GUIDE_PREFIX } from './content/paths'
import type { ContentSource, IndexNode } from './content/types'
import type { Guide } from './model/types'

const serverIndex = createServerFn({ method: 'GET' }).handler(async () => (await import('./content')).getContentSource().getIndex())

const serverGuide = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().getGuide(id))

const serverImageNames = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => (await import('./content')).getContentSource().listImages(id))

/**
 * The static site has no server: pages are rendered at build time from the content folder, and
 * the browser reads the same data as plain files under /g-data (written by `npm run build-site`).
 */
async function staticData<T>(file: string, fromDisk: (source: ContentSource) => Promise<T>): Promise<T> {
  if (import.meta.env.SSR) return fromDisk((await import('./content/staticSource')).staticSource())
  const res = await fetch(`${GUIDE_PREFIX}-data/${file}`)
  if (!res.ok) throw new Error(`${res.status} ${file}`)
  return (await res.json()) as T
}

/** The whole site hierarchy. Small enough to send in one go. */
export const fetchIndex = (): Promise<IndexNode> => (STATIC_SITE ? staticData('index.json', (s) => s.getIndex()) : serverIndex())

export const fetchGuide = ({ data: id }: { data: string }): Promise<Guide | null> =>
  STATIC_SITE ? staticData(`guide/${id}.json`, (s) => s.getGuide(id)) : serverGuide({ data: id })

export const fetchImageNames = ({ data: id }: { data: string }): Promise<string[]> =>
  STATIC_SITE ? staticData(`images/${id}.json`, (s) => s.listImages(id)) : serverImageNames({ data: id })
