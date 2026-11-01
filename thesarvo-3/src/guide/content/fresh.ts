import type { Guide } from '#/guide/model/types'
import type { HistoryEntry } from '#/guide/save/history'
import { toNode } from './disk'
import type { RawIndexNode } from './disk'
import { parseAccess } from './access'
import type { AccessMap } from './access'
import type { ContentSource, IndexNode } from './types'

/** Reads one file of the content repo (its branch head); null when it is not there. */
export type FileReader = (path: string) => Promise<string | null>

/**
 * The content packed into the Lambda is only as new as its last deploy. This lays the content repo's current
 * `index.json`, `access.json` and the guides of private or newer pages over it, so a page added or restricted
 * after the deploy shows without one. Public pages stay as bundled (the static site is what readers get). Any
 * failure falls back to the bundled copy.
 */
export function freshSource(base: ContentSource, bundledAccess: () => Promise<AccessMap>, read: FileReader, ttlMs = 30_000, now = () => Date.now()) {
  const cache = new Map<string, { at: number; value: Promise<unknown> }>()
  const cached = <T>(key: string, load: () => Promise<T>): Promise<T> => {
    const hit = cache.get(key)
    if (hit && now() - hit.at < ttlMs) return hit.value as Promise<T>
    const value = load()
    cache.set(key, { at: now(), value })
    // A failure is not kept, so the next request tries again.
    value.catch(() => cache.get(key)?.value === value && cache.delete(key))
    return value
  }
  const json = async <T>(path: string) => {
    const text = await read(path)
    return text === null ? null : (JSON.parse(text) as T)
  }
  const attempt = async <T>(fresh: () => Promise<T>, bundled: () => Promise<T>) => fresh().catch(() => bundled())

  // On failure the bundled rules apply, never none: that would make private pages public.
  const access = () => attempt(() => cached('access', async () => parseAccess(await read('access.json'))), bundledAccess)
  const freshGuide = (id: string) => cached(`guide/${id}`, () => json<Guide>(`pages/${id}/guide.json`))
  /** The bundled pages, and whether each is a guide. */
  const bundled = async () => {
    const ids = new Map<string, boolean>()
    const walk = (n: IndexNode) => (ids.set(n.id, n.isGuide), n.children.forEach(walk))
    walk(await base.getIndex())
    return ids
  }
  /** Pages whose content comes from the repo: private ones (they change by saves) and ones the bundle lacks. */
  const live = async (id: string) => !(await bundled()).has(id) || id in (await access())

  const source: ContentSource = {
    ...base,
    getIndex: () => attempt(() => cached('index', async () => {
      const raw = await json<RawIndexNode>('index.json')
      if (!raw) throw new Error('no index.json')
      const known = await bundled()
      const guides = new Set<string>()
      const mark = async (n: RawIndexNode): Promise<void> => {
        const id = String(n.id)
        if (known.get(id) ?? (await freshGuide(id)) !== null) guides.add(`${id}.xml`)
        await Promise.all(n.children.map(mark))
      }
      await mark(raw)
      return toNode(raw, '', guides)
    }), () => base.getIndex()),
    getGuide: async (id) => (/^\d+$/.test(id) && (await live(id)) ? attempt(() => freshGuide(id), () => base.getGuide(id)) : base.getGuide(id)),
    getHistory: async (id): Promise<HistoryEntry[]> =>
      /^\d+$/.test(id) && (await live(id)) ? attempt(async () => (await cached(`history/${id}`, () => json<HistoryEntry[]>(`pages/${id}/history.json`))) ?? [], () => base.getHistory(id)) : base.getHistory(id),
    getPageBody: (id) => base.getPageBody(id),
  }
  return { source, access }
}
