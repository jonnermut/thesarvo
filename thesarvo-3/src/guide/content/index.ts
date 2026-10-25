import { DEFAULT_CONTENT_DIR } from './defaultDir'
import { DiskContentSource } from './disk'
import type { ContentSource } from './types'


let source: ContentSource | undefined

/** Server-only. */
export function getContentSource(): ContentSource {
  source ??= new DiskContentSource(
    process.env.CONTENT_DIR ?? DEFAULT_CONTENT_DIR,
    process.env.UPLOAD_DIR ?? 'uploads',
    process.env.PAGES_DIR ?? '../../thesarvo-content/pages',
  )
  return source
}
