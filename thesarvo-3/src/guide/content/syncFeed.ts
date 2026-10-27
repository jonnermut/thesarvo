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

/** The fresh index from Confluence, keeping the previous index's local top-level pages after its own. */
export const withLocalPages = (fresh: StoredIndexNode, previous: StoredIndexNode | null): StoredIndexNode => ({
  ...fresh,
  children: [...fresh.children, ...(previous?.children.filter((n) => isLocalPage(n.id)) ?? [])],
})

/** The one place content files are formatted: two-space JSON, trailing newline, so reruns never create diffs. */
export const formatJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export const guideToStoredJson = (id: string, xml: string): string => formatJson(guideFromXml(id, xml) satisfies Guide)
