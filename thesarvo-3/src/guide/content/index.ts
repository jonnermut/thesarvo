import { DiskContentSource } from './disk'
import type { ContentSource } from './types'

// Folder of downloaded guides. Override with CONTENT_DIR; this default is the
// developer's existing downloader output.
const DEFAULT_DIR = '/Users/jon/git/thesarvo/thesarvo_iphone_2.0/thesarvo/www/data'

let source: ContentSource | undefined

/** Server-only. */
export function getContentSource(): ContentSource {
  source ??= new DiskContentSource(process.env.CONTENT_DIR ?? DEFAULT_DIR)
  return source
}
