import type { GuideNode } from '#/guide/model/types'
import { splitLines } from './text'

const PREFIX = { climb: 'c-', problem: 'c-', text: 't-', image: 'i-' } as const

/**
 * Element ids for deep links (`#c-173`), one per node, in node order. Ids come from node ids, so
 * links survive edits. Some guides reuse a node id; later copies get a `-2`, `-3`... suffix.
 */
export function nodeAnchors(nodes: GuideNode[]): (string | undefined)[] {
  const seen = new Map<string, number>()
  return nodes.map((node) => {
    if (node.type === 'unknown') return undefined
    const base = node.type === 'header' ? 'intro' : node.type === 'gps' ? 'gps' : `${PREFIX[node.type]}${node.id}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  })
}

export type ContentsEntry = {
  anchor: string
  kind: 'intro' | 'heading' | 'climb' | 'gps'
  /** 0 for main headings, 1 for sub-headings and climbs. */
  level: 0 | 1
  text: string
  number?: string
  grade?: string
  stars?: string
}

const HEADING_LEVEL: Record<string, 0 | 1> = { heading1: 0, heading2: 0, heading3: 1 }

const oneLine = (text: string) =>
  splitLines(text)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')

/** The guide's table of contents, as in the apps: introduction, headings, climbs and GPS. */
export function guideContents(nodes: GuideNode[]): ContentsEntry[] {
  const anchors = nodeAnchors(nodes)
  return nodes.flatMap((node, i): ContentsEntry[] => {
    const anchor = anchors[i]
    if (!anchor) return []
    switch (node.type) {
      case 'header':
        return [{ anchor, kind: 'intro', level: 0, text: 'Introduction' }]
      case 'text': {
        const level = HEADING_LEVEL[node.cls]
        const text = oneLine(node.text)
        return level === undefined || !text ? [] : [{ anchor, kind: 'heading', level, text }]
      }
      case 'climb':
      case 'problem':
        return [{ anchor, kind: 'climb', level: 1, text: node.name || 'Unnamed', number: node.number, grade: node.grade, stars: node.stars }]
      case 'gps':
        return node.points.length || node.lines.length ? [{ anchor, kind: 'gps', level: 0, text: 'GPS' }] : []
      default:
        return []
    }
  })
}

const normalise = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Every word of the query must appear in the entry's name, grade or stars ("** 22 arete"). */
export function matchesQuery(entry: ContentsEntry, query: string): boolean {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  const haystack = normalise(`${entry.stars ?? ''} ${entry.grade ?? ''} ${entry.text}`)
  return words.every((w) => haystack.includes(w))
}
