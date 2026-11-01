import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Guide } from '#/guide/model/types'
import { DEFAULT_CONTENT_DIR } from './defaultDir'
import { DiskContentSource, readHistory, toNode } from './disk'
import type { RawIndexNode } from './disk'
import { publicSource } from './access'
import type { AccessMap } from './access'
import { freshSource } from './fresh'
import { JsonContentSource, readAccess } from './json'
import type { ContentSource, IndexNode } from './types'

let source: ContentSource | undefined
let full: { all: ContentSource; access: () => Promise<AccessMap> } | undefined

function build() {
  if (full) return full
  const json = process.env.CONTENT_FORMAT === 'json'
  const dir = process.env.CONTENT_DIR ?? (json ? '../../thesarvo-content' : DEFAULT_CONTENT_DIR)
  const pages = process.env.PAGES_DIR ?? '../../thesarvo-content/pages'
  const all = json ? new JsonContentSource(dir) : new DiskContentSource(dir, process.env.UPLOAD_DIR ?? 'uploads', pages)
  if (process.env.NODE_ENV === 'development') withSaves(all, process.env.SAVES_DIR ?? '.saves')
  const bundledAccess = () => readAccess(json ? dir : path.dirname(pages))
  // On the Lambda the bundled content is as old as the last deploy; the content repo has the current index, rules and private pages.
  if (json && process.env.CONTENT_REPO && process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const repo = import('#/guide/save/github').then((m) => new m.GitHubRepo(process.env.CONTENT_REPO!, process.env.CONTENT_BRANCH ?? 'main'))
    const fresh = freshSource(all, bundledAccess, async (file) => (await repo).file(file))
    return (full = { all: fresh.source, access: fresh.access })
  }
  return (full = { all, access: bundledAccess })
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
  // Pages added in development (see LocalRepo.commitPage) come with a saved tree.
  const getIndex = s.getIndex.bind(s)
  s.getIndex = async () => {
    const saved = await readFile(path.join(dir, 'index.json'), 'utf8').catch(() => null)
    if (!saved) return getIndex()
    const guides = new Set((await readdir(path.join(dir, 'pages')).catch(() => [] as string[])).map((id) => `${id}.xml`))
    const mark = (n: IndexNode) => (n.isGuide && guides.add(`${n.id}.xml`), n.children.forEach(mark))
    mark(await getIndex())
    return toNode(JSON.parse(saved) as RawIndexNode, '', guides)
  }
  const getHistory = s.getHistory.bind(s)
  s.getHistory = async (id) => {
    const saved = await readHistory(path.join(dir, 'pages'), id)
    return saved.length ? saved : getHistory(id)
  }
}
