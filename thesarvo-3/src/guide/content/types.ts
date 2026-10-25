import type { Guide } from '#/guide/model/types'
import type { GuideStats } from './manifest'

/** One page in the site hierarchy (from index.json). */
export type IndexNode = {
  id: string
  title: string
  /** URL path below the guide prefix, e.g. "south-east/bruny-island". */
  path: string
  /** False for plain pages that have no guide XML. */
  isGuide: boolean
  children: IndexNode[]
  /** From the manifest: the page's own guide, and climbs in it and below. */
  stats?: GuideStats
  count?: number
  /** Guides with climbs in it and below. */
  guides?: number
  /** Children were left out of this copy of the tree (see pageInfo). */
  more?: true
}

/**
 * Where guides come from. Today a folder of downloaded files; later the
 * content git repo plus object storage. Nothing outside this folder knows which.
 */
export interface ContentSource {
  getIndex: () => Promise<IndexNode>
  getGuide: (id: string) => Promise<Guide | null>
  /** The cleaned body of a page that is not a guide (see pageBody), or null if it has none. */
  getPageBody: (id: string) => Promise<string | null>
  /** Image names attached to a guide (without the id prefix, thumbnails excluded). */
  listImages: (guideId: string) => Promise<string[]>
  /** Stores an uploaded image for a guide and returns the name the guide should reference. */
  saveImage: (guideId: string, fileName: string, bytes: Uint8Array) => Promise<string>
  /** Reads an image (or other file) for serving in development. */
  readFile: (name: string) => Promise<Uint8Array | null>
}
