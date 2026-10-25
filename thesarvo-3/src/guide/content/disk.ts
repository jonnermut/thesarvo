import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { guideFromXml } from '#/guide/convert/xml'
import { slugify } from './paths'
import type { ContentSource, IndexNode } from './types'

type RawIndexNode = { id: number; title: string; children: RawIndexNode[] }

/**
 * Reads the folder written by the old downloader tools: `index.json`, one
 * `<pageId>.xml` per guide, and images beside them.
 */
export class DiskContentSource implements ContentSource {
  private index?: Promise<IndexNode>

  constructor(private readonly dir: string) {}

  getIndex() {
    this.index ??= this.loadIndex()
    return this.index
  }

  async getGuide(id: string) {
    if (!/^\d+$/.test(id)) return null
    const xml = await this.read(`${id}.xml`)
    return xml ? guideFromXml(id, new TextDecoder().decode(xml)) : null
  }

  readFile(name: string) {
    return this.read(name)
  }

  private async read(name: string) {
    // Only plain file names: never let a request climb out of the folder.
    if (name !== path.basename(name)) return null
    try {
      return await readFile(path.join(this.dir, name))
    } catch {
      return null
    }
  }

  private async loadIndex(): Promise<IndexNode> {
    const raw = JSON.parse(await readFile(path.join(this.dir, 'index.json'), 'utf8')) as RawIndexNode
    const guideFiles = new Set((await readdir(this.dir)).filter((f) => f.endsWith('.xml')))
    return toNode(raw, '', guideFiles)
  }
}

function toNode(raw: RawIndexNode, parentPath: string, guideFiles: Set<string>): IndexNode {
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
