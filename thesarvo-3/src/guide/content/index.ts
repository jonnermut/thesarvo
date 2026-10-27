import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Guide } from '#/guide/model/types'
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
  if (process.env.NODE_ENV === 'development') withSaves(source, process.env.SAVES_DIR ?? '.saves')
  return source
}

/** On the dev server, guides saved in the editor (see `src/guide/save/local.ts`) are read from the saves folder first. */
function withSaves(s: ContentSource, dir: string) {
  const getGuide = s.getGuide.bind(s)
  s.getGuide = async (id) => {
    const saved = await readFile(path.join(dir, 'pages', id, 'guide.json'), 'utf8').catch(() => null)
    // Written by the dev server's own saves.
    return saved ? (JSON.parse(saved) as Guide) : getGuide(id)
  }
}
