import type { Guide } from '#/guide/model/types'

/** One row of the Confluence attachment export (`attachments.tsv` in the content repo). */
export type AttachmentRow = { id: string; title: string; page: string; version: number; prev: string }

/**
 * Old versions of an attachment are rows of their own whose `prev` names the
 * newest one, so a name on a page can have many rows. Files are stored as
 * `<folderId>/<folderId>.<version>` under v4/<a>/<b>/.
 */
export function parseAttachments(tsv: string): AttachmentRow[] {
  return tsv
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [id = '', title = '', page = '', version = '0', prev = ''] = line.split('\t')
      return { id, title, page, version: Number(version), prev: prev === 'NULL' ? '' : prev }
    })
}

/** `v4/` paths relative to the mirror root, by attachment folder id and version. */
export function indexStoredFiles(keys: Iterable<string>) {
  const files = new Map<string, string>()
  for (const key of keys) {
    const m = /^v4\/\d+\/\d+\/(\d+)\/\1\.(\d+)$/.exec(key)
    if (m) files.set(`${m[1]}.${m[2]}`, key)
  }
  return files
}

/** Image names each guide uses: `<guideId>/<name>`. */
export function referencedImages(guides: Guide[]) {
  const out = new Set<string>()
  for (const g of guides) for (const n of g.nodes) if (n.type === 'image' && n.src) out.add(`${g.id}/${n.src}`)
  return out
}

/** The newest stored version of each `<page>/<name>`: the mirror key of its file. */
export function latestFiles(rows: AttachmentRow[], stored: Map<string, string>) {
  const best = new Map<string, { version: number; key: string }>()
  for (const r of rows) {
    const key = stored.get(`${r.id}.${r.version}`) ?? (r.prev && stored.get(`${r.prev}.${r.version}`))
    if (!key) continue
    const name = `${r.page}/${r.title}`
    if (r.version > (best.get(name)?.version ?? 0)) best.set(name, { version: r.version, key })
  }
  return new Map([...best].map(([name, { key }]) => [name, key]))
}

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  heic: 'image/heic', pdf: 'application/pdf', svg: 'image/svg+xml',
}
export const contentTypeOf = (name: string) => TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
