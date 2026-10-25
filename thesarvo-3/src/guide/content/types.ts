import type { Guide } from '#/guide/model/types'

/** One page in the site hierarchy (from index.json). */
export type IndexNode = {
  id: string
  title: string
  /** URL path below the guide prefix, e.g. "south-east/bruny-island". */
  path: string
  /** False for plain pages that have no guide XML. */
  isGuide: boolean
  children: IndexNode[]
}

/**
 * Where guides come from. Today a folder of downloaded files; later the
 * content git repo plus object storage. Nothing outside this folder knows which.
 */
export interface ContentSource {
  getIndex(): Promise<IndexNode>
  getGuide(id: string): Promise<Guide | null>
  /** Image names attached to a guide (without the id prefix, thumbnails excluded). */
  listImages(guideId: string): Promise<string[]>
  /** Reads an image (or other file) for serving in development. */
  readFile(name: string): Promise<Uint8Array | null>
}
