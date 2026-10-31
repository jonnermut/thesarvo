import { flatten } from '#/guide/content/paths'
import { readableGrafts } from '#/guide/content/privateSite'
import type { Graft } from '#/guide/content/privateSite'
import type { AccessMap } from '#/guide/content/access'
import type { PrivatePage } from '#/guide/content/privatePage'
import type { IndexNode } from '#/guide/content/types'

/** Signed photo links in the apps' private manifest last this long: enough to download a few hundred photos on a slow connection. */
export const APP_LINK_SECONDS = 6 * 3600

/**
 * What `GET /g/api/app-private-manifest` sends a signed-in app: every private page the person may read (the tree grafts and each
 * page's guide or body and history) and a signed, expiring link for each of its photos. The app keeps it in its `private/` store,
 * apart from the public one, and answers `/g/api/private` and `/g/api/private-tree` from it when offline.
 */
export type PrivateManifest = {
  schema: 1
  builtAt: string
  /** When the photo links stop working; the app fetches the manifest again to get fresh ones. */
  expiresAt: string
  grafts: Graft[]
  pages: Record<string, Omit<PrivatePage, 'images'>>
  images: { g: string; n: string; u: string }[]
}

export async function buildPrivateManifest(d: {
  index: IndexNode
  access: AccessMap
  groups: readonly string[]
  now: Date
  loadPage: (id: string, isGuide: boolean) => Promise<PrivatePage>
}): Promise<PrivateManifest> {
  const grafts = readableGrafts(d.index, d.access, d.groups)
  const nodes = grafts.flatMap((g) => flatten(g.node))
  const pages: PrivateManifest['pages'] = {}
  const images: PrivateManifest['images'] = []
  for (const n of nodes) {
    const { images: photos, ...page } = await d.loadPage(n.id, n.isGuide)
    pages[n.id] = page
    for (const [name, u] of Object.entries(photos)) images.push({ g: n.id, n: name, u })
  }
  return { schema: 1, builtAt: d.now.toISOString(), expiresAt: new Date(d.now.getTime() + APP_LINK_SECONDS * 1000).toISOString(), grafts, pages, images }
}
