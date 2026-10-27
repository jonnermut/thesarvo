import { DEFAULT_CONTENT_DIR } from './defaultDir'
import { DiskContentSource } from './disk'
import { JsonContentSource } from './json'
import type { ContentSource } from './types'


let source: ContentSource | undefined

/** Server-only. `CONTENT_FORMAT=json` reads a content repo checkout (as the Lambda build does) instead of the downloader folder. */
export function getContentSource(): ContentSource {
  source ??= process.env.CONTENT_FORMAT === 'json' ? new JsonContentSource(process.env.CONTENT_DIR ?? '../../thesarvo-content') : new DiskContentSource(
    process.env.CONTENT_DIR ?? DEFAULT_CONTENT_DIR,
    process.env.UPLOAD_DIR ?? 'uploads',
    process.env.PAGES_DIR ?? '../../thesarvo-content/pages',
  )
  return source
}
