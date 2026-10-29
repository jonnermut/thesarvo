import { XMLParser } from 'fast-xml-parser'
import type { Guide } from '#/guide/model/types'
import { guideFromXml } from '#/guide/convert/xml'

/** One entry of the Confluence sync feed: a file the apps would download. */
export type FeedEntry = { url: string; filename: string; lastModified: number }
export type Feed = { maxLastMod: number; indexHash: string; entries: FeedEntry[] }

/** Index node as the live site sends it (and as the content repo stores it, minus the url). */
export type RawIndexNode = { id: number | string; title: string; url?: string; children?: RawIndexNode[] }
export type StoredIndexNode = { id: string; title: string; children: StoredIndexNode[] }

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', isArray: (name) => name === 'update' })

/** Reads `<updates maxLastMod indexHash><update url filename lastModified/>…</updates>`. */
export function parseFeed(xml: string): Feed {
  const root = parser.parse(xml).updates ?? {}
  const entries: FeedEntry[] = (root.update ?? []).map((u: Record<string, string>) => ({
    url: u.url.replace('http://www.thesarvo.com', 'https://www.thesarvo.com'),
    filename: u.filename,
    lastModified: Number(u.lastModified),
  }))
  return { maxLastMod: Number(root.maxLastMod ?? 0), indexHash: String(root.indexHash ?? ''), entries }
}

/** Guides are the `<pageId>.xml` entries; everything else in the feed is an image. */
export const guideEntries = (feed: Feed) => feed.entries.filter((e) => /^\d+\.xml$/.test(e.filename))

export const guideIdOf = (entry: FeedEntry) => entry.filename.replace(/\.xml$/, '')

export function storedIndex(node: RawIndexNode): StoredIndexNode {
  return { id: String(node.id), title: node.title, children: (node.children ?? []).map(storedIndex) }
}

/** Ids from here up are pages made in the content repo (such as the test guide), never by Confluence, whose ids are far below. */
const LOCAL_ID_MIN = 9_000_000_000
export const isLocalPage = (id: string) => /^\d+$/.test(id) && Number(id) >= LOCAL_ID_MIN

/** The local pages of an index with the id of the page each hangs under (a local page's own local children come with it). */
const localChildren = (node: StoredIndexNode): { parent: string; page: StoredIndexNode }[] =>
  node.children.flatMap((c) => (isLocalPage(c.id) ? [{ parent: node.id, page: c }] : localChildren(c)))

/** The fresh index from Confluence, keeping the previous index's local pages where they were (at the end of the same parent; at the end of the top level if that parent is gone). */
export function withLocalPages(fresh: StoredIndexNode, previous: StoredIndexNode | null): StoredIndexNode {
  const kept = previous ? localChildren(previous) : []
  const ids = new Set<string>()
  const collect = (n: StoredIndexNode) => (ids.add(n.id), n.children.forEach(collect))
  collect(fresh)
  const add = (n: StoredIndexNode, top: boolean): StoredIndexNode => ({
    ...n,
    children: [...n.children.map((c) => add(c, false)), ...kept.filter((k) => k.parent === n.id || (top && !ids.has(k.parent))).map((k) => k.page)],
  })
  return add(fresh, true)
}

/**
 * What Confluence's index says that ours does not, once ours is kept by hand (sync.json `indexLocked`: pages moved to Stuff or the Archive, so the
 * sync must not overwrite it). Compared by page id, only over the pages Confluence lists; where a page sits is ours to decide, so a move is not a change.
 */
export function indexChanges(live: StoredIndexNode, ours: StoredIndexNode): string[] {
  const titles = (root: StoredIndexNode) => {
    const out = new Map<string, string>()
    const walk = (n: StoredIndexNode) => (out.set(n.id, n.title), n.children.forEach(walk))
    walk(root)
    return out
  }
  const mine = titles(ours)
  const theirs = titles(live)
  return [
    ...[...theirs].filter(([id]) => !mine.has(id)).map(([id, t]) => `new in Confluence: ${id} ${t}`),
    ...[...theirs].filter(([id, t]) => mine.has(id) && mine.get(id) !== t).map(([id, t]) => `renamed in Confluence: ${id} ${mine.get(id)} -> ${t}`),
  ]
}

/** The one place content files are formatted: two-space JSON, trailing newline, so reruns never create diffs. */
export const formatJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export const guideToStoredJson = (id: string, xml: string): string => formatJson(guideFromXml(id, xml) satisfies Guide)
