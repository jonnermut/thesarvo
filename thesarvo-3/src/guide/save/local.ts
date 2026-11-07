import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Guide } from '#/guide/model/types'
import { getFullContent } from '#/guide/content'
import { formatJson } from '#/guide/content/syncFeed'
import type { ContentSource, IndexNode } from '#/guide/content/types'
import { canonical, ensureIds } from './changes'
import type { HistoryEntry } from './history'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { bodyPath, guidePath, historyPath, indexPath } from './repo'
import type { BodyRepo, GuideRepo, PageRepo, Stored, StoredBody } from './repo'

const storedOf = (n: IndexNode): StoredIndexNode => ({ id: n.id, title: n.title, children: n.children.map(storedOf) })

const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, 'utf8').catch(() => 'null'))

/** FNV-1a of a guide's canonical JSON: the "commit" a local save is made on top of. */
const version = (guide: Guide) => textVersion(canonical(guide))
const textVersion = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16)
}

/**
 * Saves for development, in a gitignored folder laid out like the content repo. A guide not saved there yet is read
 * from the content source. Saves are not committed anywhere.
 */
export class LocalRepo implements GuideRepo, PageRepo, BodyRepo {
  constructor(
    private readonly dir: string,
    private readonly source: () => Pick<ContentSource, 'getGuide' | 'getIndex' | 'getPageBody'>,
  ) {}

  /** The saved guide, if this folder has one. */
  async saved(id: string): Promise<Guide | null> {
    // The folder is this repo's own output, so it holds what `commit` wrote.
    return (await readJson(path.join(this.dir, guidePath(id)))) as Guide | null
  }

  async read(id: string): Promise<Stored | null> {
    const guide = (await this.saved(id)) ?? (await this.source().getGuide(id))
    if (!guide) return null
    const history = ((await readJson(path.join(this.dir, historyPath(id)))) as HistoryEntry[] | null) ?? []
    const withIds = ensureIds(guide)
    return { head: version(withIds), guide: withIds, history }
  }

  async readBody(id: string): Promise<StoredBody | null> {
    const saved = await readFile(path.join(this.dir, bodyPath(id)), 'utf8').catch(() => null)
    const html = saved ?? (await this.source().getPageBody(id))
    if (html === null) return null
    const history = ((await readJson(path.join(this.dir, historyPath(id)))) as HistoryEntry[] | null) ?? []
    return { head: textVersion(html), html, history }
  }

  async commitBody({ id, head, html, history, message }: Parameters<BodyRepo['commitBody']>[0]) {
    const now = await this.readBody(id)
    if (now && now.head !== head) return null
    await this.write(historyPath(id), history)
    await this.write(bodyPath(id), html)
    console.log(`saved page ${id}: ${message.headline}`)
    return textVersion(html)
  }

  private async write(file: string, value: unknown) {
    const to = path.join(this.dir, file)
    await mkdir(path.dirname(to), { recursive: true })
    await writeFile(`${to}.tmp`, typeof value === 'string' ? value : formatJson(value))
    await rename(`${to}.tmp`, to)
  }

  /** The saved tree if this folder has one, else the content source's. */
  async readIndex(): Promise<{ head: string; index: StoredIndexNode }> {
    const saved = (await readJson(path.join(this.dir, indexPath))) as StoredIndexNode | null
    const index = saved ?? storedOf(await this.source().getIndex())
    return { head: canonical(index), index }
  }

  async commitPage({ head, index, id, guide, history, message }: Parameters<PageRepo['commitPage']>[0]) {
    if ((await this.readIndex()).head !== head) return null
    await this.write(historyPath(id), history)
    await this.write(guidePath(id), guide)
    await this.write(indexPath, index)
    console.log(`added page ${id}: ${message.headline}`)
    return version(guide)
  }

  async commitIndex({ head, index, message }: Parameters<PageRepo['commitIndex']>[0]) {
    const now = await this.readIndex()
    if (now.head !== head) return null
    await this.write(indexPath, index)
    console.log(`changed the page tree: ${message.headline}`)
    return canonical(index)
  }

  async commit({ id, head, guide, history, message }: Parameters<GuideRepo['commit']>[0]) {
    const now = await this.read(id)
    if (now && now.head !== head) return null
    await this.write(historyPath(id), history)
    await this.write(guidePath(id), guide)
    console.log(`saved ${id}: ${message.headline}`)
    return version(guide)
  }
}

let local: LocalRepo | undefined
export const localRepo = () => (local ??= new LocalRepo(process.env.SAVES_DIR ?? '.saves', () => getFullContent().all))
