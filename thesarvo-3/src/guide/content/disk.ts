import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { guideFromXml } from '#/guide/convert/xml'
import { freeName, isHiddenPage, navTitle, slugify, uploadName } from './paths'
import type { HistoryEntry } from '#/guide/save/history'
import type { ContentSource, IndexNode } from './types'

export type RawIndexNode = { id: number; title: string; children: RawIndexNode[] }

/**
 * Reads the folder written by the old downloader tools: `index.json`, one
 * `<pageId>.xml` per guide, and images beside them.
 */
export class DiskContentSource implements ContentSource {
  private index?: Promise<IndexNode>

  /**
   * `uploadDir` keeps new images apart from the downloaded content, which stays read-only. The old
   * downloads have no page bodies, so those come from the content repo's `pages` folder.
   */
  constructor(
    private readonly dir: string,
    private readonly uploadDir = path.join(dir, 'uploads'),
    private readonly pagesDir = path.join(dir, 'pages'),
  ) {}

  getIndex() {
    this.index ??= this.loadIndex()
    return this.index
  }

  async getGuide(id: string) {
    if (!/^\d+$/.test(id)) return null
    const xml = await this.read(`${id}.xml`)
    return xml ? guideFromXml(id, new TextDecoder().decode(xml)) : null
  }

  getPageBody(id: string) {
    return readPageBody(this.pagesDir, id)
  }

  getHistory(id: string) {
    return readHistory(this.pagesDir, id)
  }

  async saveImage(guideId: string, fileName: string, bytes: Uint8Array) {
    const name = uploadName(fileName)
    if (!/^\d+$/.test(guideId) || !name) throw new Error('Not a supported image')
    await mkdir(this.uploadDir, { recursive: true })
    const stored = freeName(name, new Set(await this.listImages(guideId)))
    await writeFile(path.join(this.uploadDir, `${guideId}-${stored}`), bytes)
    return stored
  }

  async listImages(guideId: string) {
    const prefix = `${guideId}-`
    const files = [...(await readdir(this.dir)), ...(await readdir(this.uploadDir).catch(() => []))]
    return files
      .filter((f) => f.startsWith(prefix) && !f.startsWith(`${prefix}t-`) && /\.(jpe?g|png|gif)$/i.test(f))
      .map((f) => f.slice(prefix.length))
      .sort()
  }

  readFile(name: string) {
    return this.read(name)
  }

  private async read(name: string) {
    // Only plain file names: never let a request climb out of the folder.
    if (name !== path.basename(name)) return null
    for (const dir of [this.dir, this.uploadDir]) {
      try {
        return await readFile(path.join(dir, name))
      } catch {
        // Not in this folder: try the next.
      }
    }
    return null
  }

  private async loadIndex(): Promise<IndexNode> {
    const raw = JSON.parse(await readFile(path.join(this.dir, 'index.json'), 'utf8')) as RawIndexNode
    const guideFiles = new Set((await readdir(this.dir)).filter((f) => f.endsWith('.xml')))
    return toNode(raw, '', guideFiles)
  }
}

export function toNode(raw: RawIndexNode, parentPath: string, guideFiles: Set<string>): IndexNode {
  const id = String(raw.id)
  const seen = new Set<string>()
  const children = raw.children.filter((child) => !isHiddenPage(child.title)).map((child) => {
    // Sibling titles can collide after slugifying; the id keeps them distinct.
    let slug = slugify(child.title) || String(child.id)
    if (seen.has(slug)) slug = `${slug}-${child.id}`
    seen.add(slug)
    return toNode(child, parentPath ? `${parentPath}/${slug}` : slug, guideFiles)
  })
  // Slugs use the original title so URLs stay put; only the shown title is tidied.
  return { id, title: navTitle(raw.title), path: parentPath, isGuide: guideFiles.has(`${id}.xml`), children }
}

/** `pages/<id>/page.html` under `pagesDir`, or null. */
export async function readHistory(pagesDir: string, id: string): Promise<HistoryEntry[]> {
  if (!/^\d+$/.test(id)) return []
  const json = await readFile(path.join(pagesDir, id, 'history.json'), 'utf8').catch(() => null)
  // Written by the site's saves (see src/guide/save).
  return json ? (JSON.parse(json) as HistoryEntry[]) : []
}

export async function readPageBody(pagesDir: string, id: string): Promise<string | null> {
  if (!/^\d+$/.test(id)) return null
  return readFile(path.join(pagesDir, id, 'page.html'), 'utf8').catch(() => null)
}
