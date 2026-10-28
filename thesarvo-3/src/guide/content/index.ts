import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Guide } from '#/guide/model/types'
import { DEFAULT_CONTENT_DIR } from './defaultDir'
import { DiskContentSource, readHistory } from './disk'
import { publicSource } from './access'
import type { AccessMap } from './access'
import { JsonContentSource, readAccess } from './json'
import type { ContentSource } from './types'

let source: ContentSource | undefined
let full: { all: ContentSource; access: () => Promise<AccessMap> } | undefined

function build() {
  if (full) return full
  const json = process.env.CONTENT_FORMAT === 'json'
  const dir = process.env.CONTENT_DIR ?? (json ? '../../thesarvo-content' : DEFAULT_CONTENT_DIR)
  const pages = process.env.PAGES_DIR ?? '../../thesarvo-content/pages'
  const all = json ? new JsonContentSource(dir) : new DiskContentSource(dir, process.env.UPLOAD_DIR ?? 'uploads', pages)
  if (process.env.NODE_ENV === 'development') withSaves(all, process.env.SAVES_DIR ?? '.saves')
  return (full = { all, access: () => readAccess(json ? dir : path.dirname(pages)) })
}

/** Server-only. `CONTENT_FORMAT=json` reads a content repo checkout (as the Lambda build does) instead of the downloader folder; either way private pages are left out (access.ts). */
export function getContentSource(): ContentSource {
  // Private pages are filtered last, so nothing underneath (not even a dev save) can bring one back.
  return (source ??= publicSource(build().all, build().access))
}

/**
 * Server-only, and only for code that has checked who is asking (src/auth/pageGuard.ts): every page, private ones
 * included, with the access rules. Never hand its output to someone `canRead` has not cleared.
 */
export const getFullContent = () => build()

/** On the dev server, guides saved in the editor (see `src/guide/save/local.ts`) are read from the saves folder first. */
function withSaves(s: ContentSource, dir: string) {
  const getGuide = s.getGuide.bind(s)
  s.getGuide = async (id) => {
    const saved = await readFile(path.join(dir, 'pages', id, 'guide.json'), 'utf8').catch(() => null)
    // Written by the dev server's own saves.
    return saved ? (JSON.parse(saved) as Guide) : getGuide(id)
  }
  const getHistory = s.getHistory.bind(s)
  s.getHistory = async (id) => {
    const saved = await readHistory(path.join(dir, 'pages'), id)
    return saved.length ? saved : getHistory(id)
  }
}
