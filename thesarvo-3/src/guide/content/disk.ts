import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { guideFromXml } from '#/guide/convert/xml'
import { slugify, uploadName } from './paths'
import type { ContentSource, IndexNode } from './types'

export type RawIndexNode = { id: number; title: string; children: RawIndexNode[] }

/**
 * Reads the folder written by the old downloader tools: `index.json`, one
 * `<pageId>.xml` per guide, and images beside them.
 */
export class DiskContentSource implements ContentSource {
  private index?: Promise<IndexNode>

  /** `uploadDir` keeps new images apart from the downloaded content, which stays read-only. */
  constructor(
    private readonly dir: string,
    private readonly uploadDir = path.join(dir, 'uploads'),
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

  async saveImage(guideId: string, fileName: string, bytes: Uint8Array) {
    const name = uploadName(fileName)
    if (!/^\d+$/.test(guideId) || !name) throw new Error('Not a supported image')
    await mkdir(this.uploadDir, { recursive: true })
    const taken = new Set(await this.listImages(guideId))
    // Never overwrite: "a.jpg" becomes "a-2.jpg", "a-3.jpg"...
    const dot = name.lastIndexOf('.')
    let stored = name
    for (let n = 2; taken.has(stored); n++) stored = `${name.slice(0, dot)}-${n}${name.slice(dot)}`
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
  const children = raw.children.map((child) => {
    // Sibling titles can collide after slugifying; the id keeps them distinct.
    let slug = slugify(child.title) || String(child.id)
    if (seen.has(slug)) slug = `${slug}-${child.id}`
    seen.add(slug)
    return toNode(child, parentPath ? `${parentPath}/${slug}` : slug, guideFiles)
  })
  return { id, title: raw.title, path: parentPath, isGuide: guideFiles.has(`${id}.xml`), children }
}
