import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Guide } from '#/guide/model/types'
import { readHistory, readPageBody, toNode } from './disk'
import type {RawIndexNode} from './disk';
import { referencedImages } from './attachments'
import type { ContentSource } from './types'

/**
 * Reads a checkout of the content repo: `index.json`, `pages/<id>/guide.json` and, for pages that
 * are not guides, `pages/<id>/page.html`.
 * Read-only, and images live in object storage, so the file and upload methods refuse.
 */
export class JsonContentSource implements ContentSource {
  private index?: ReturnType<JsonContentSource['loadIndex']>

  constructor(private readonly dir: string) {}

  getIndex() {
    this.index ??= this.loadIndex()
    return this.index
  }

  async getGuide(id: string) {
    if (!/^\d+$/.test(id)) return null
    try {
      return JSON.parse(await readFile(path.join(this.dir, 'pages', id, 'guide.json'), 'utf8')) as Guide
    } catch {
      return null
    }
  }

  getPageBody(id: string) {
    return readPageBody(path.join(this.dir, 'pages'), id)
  }

  getHistory(id: string) {
    return readHistory(path.join(this.dir, 'pages'), id)
  }

  /** The images the guide already uses: all that the static site can offer. */
  async listImages(guideId: string) {
    const guide = await this.getGuide(guideId)
    return guide ? [...referencedImages([guide])].map((n) => n.slice(guideId.length + 1)).sort() : []
  }

  saveImage(): Promise<string> {
    return Promise.reject(new Error('This site is read-only'))
  }

  readFile() {
    return Promise.resolve(null)
  }

  private async loadIndex() {
    const raw = JSON.parse(await readFile(path.join(this.dir, 'index.json'), 'utf8')) as RawIndexNode
    const pages = path.join(this.dir, 'pages')
    const guides = new Set<string>()
    for (const id of await readdir(pages)) {
      if (await access(path.join(pages, id, 'guide.json')).then(() => true, () => false)) guides.add(`${id}.xml`)
    }
    return toNode(raw, '', guides)
  }
}
