import type { IndexNode } from '#/guide/content/types'
import { gradeNumber } from '#/guide/view/routeStats'
import type { Shard } from './shard'

export type HitKind = 'page' | 'h' | 'c' | 'p'

/** Something search can find: a page, or a heading, climb or problem in a guide. */
export type Item = {
  kind: HitKind
  /** The page, or the guide the entry is in. */
  node: IndexNode
  /** Pages and regions above `node`, below the root. */
  trail: IndexNode[]
  anchor?: string
  text: string
  grade?: string
  stars?: number
  sport?: boolean
  /** Normalised text, with a space either side so word starts can be found. */
  norm: string
  /** Normalised titles of the guide and the regions above it. */
  scope: string
  gradeN?: number | null
}

export type SearchIndex = Item[]

export type Hit = Item & { score: number }

/** Results for one page: the page itself when its title matched, and what matched inside it. */
export type Group = { node: IndexNode; trail: IndexNode[]; page?: Hit; hits: Hit[] }

const WORDS: Record<string, string> = { mount: 'mt', saint: 'st' }

/** Case, accents and punctuation ignored; "Mount" and "Mt" are the same word. */
export const normalise = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => WORDS[w] ?? w)
    .join(' ')

const pad = (s: string) => ` ${s} `

/** The site's pages plus every guide's entries, ready to search. Shards for guides not in the tree are ignored. */
export function buildSearchIndex(root: IndexNode, shards: Shard[]): SearchIndex {
  const items: Item[] = []
  const byId = new Map<string, { node: IndexNode; trail: IndexNode[] }>()
  const walk = (node: IndexNode, trail: IndexNode[]) => {
    byId.set(node.id, { node, trail })
    if (node !== root) items.push({ kind: 'page', node, trail, text: node.title, norm: pad(normalise(node.title)), scope: pad(trail.map((n) => normalise(n.title)).join(' ')) })
    for (const c of node.children) walk(c, node === root ? [] : [...trail, node])
  }
  walk(root, [])
  for (const shard of shards) {
    const at = byId.get(shard.g)
    if (!at) continue
    const scope = pad([...at.trail, at.node].map((n) => normalise(n.title)).join(' '))
    for (const e of shard.e) {
      const base = { node: at.node, trail: at.trail, anchor: e[1], text: e[2], norm: pad(normalise(e[2])), scope }
      if (e[0] === 'h') items.push({ ...base, kind: 'h' })
      else items.push({ ...base, kind: e[0], grade: e[3], stars: e[4], sport: e[5] === 1, gradeN: gradeNumber(e[3]) })
    }
  }
  return items
}

type Query = {
  words: string[]
  /** The words as one string, for exact and prefix matches. */
  text: string
  grade?: [number, number]
  /** Numbers that may be a grade or part of a name ("Catch 22"). */
  numbers: string[]
  stars?: number
  type?: 'sport' | 'trad' | 'boulder'
}

/** Splits a query into words and filters: a grade (22) or range (20-23), stars (** or ★★), sport, trad or boulder. */
export function parseQuery(input: string): Query {
  const q: Query = { words: [], text: '', numbers: [] }
  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    const range = /^(\d{1,2})-(\d{1,2})$/.exec(token)
    const lower = token.toLowerCase()
    if (/^[*★]+$/.test(token)) q.stars = Math.min(token.length, 3)
    else if (range) q.grade = [Number(range[1]), Number(range[2])]
    else if (/^v?\d{1,2}$/i.test(token)) q.numbers.push(lower.replace('v', ''))
    else if (lower === 'sport' || lower === 'trad' || lower === 'boulder' || lower === 'boulders') q.type = lower === 'boulders' ? 'boulder' : lower
    else q.words.push(...normalise(token).split(' ').filter(Boolean))
  }
  q.text = q.words.join(' ')
  return q
}

const hasFilter = (q: Query) => !!(q.grade || q.stars || q.type)

function passesFilters(item: Item, q: Query): boolean {
  if (!hasFilter(q)) return true
  if (item.kind !== 'c' && item.kind !== 'p') return false
  if (q.type === 'boulder' && item.kind !== 'p') return false
  if ((q.type === 'sport' || q.type === 'trad') && (item.kind !== 'c' || item.sport !== (q.type === 'sport'))) return false
  if (q.stars && (item.stars ?? 0) < q.stars) return false
  if (q.grade && (item.gradeN == null || item.gradeN < Math.min(...q.grade) || item.gradeN > Math.max(...q.grade))) return false
  return true
}

/**
 * Lower is better: the whole text exactly (0), its start (1), word starts (2), anywhere (3). Every
 * word must be found in the entry or the titles above it, and at least one in the entry itself
 * unless a filter is doing the choosing. Null when it does not match.
 */
function score(item: Item, q: Query): number | null {
  let own = 0
  let wordStarts = true
  for (const w of q.words) {
    if (item.norm.includes(` ${w}`)) own++
    else if (item.norm.includes(w)) {
      own++
      wordStarts = false
    } else if (!item.scope.includes(` ${w}`)) return null
  }
  // A number is a grade when the entry has that grade, otherwise a word of its name.
  let gradeMatched = false
  for (const n of q.numbers) {
    if (item.gradeN != null && item.gradeN === Number(n)) gradeMatched = true
    else if (item.norm.includes(` ${n} `)) own++
    else return null
  }
  if (!own && !gradeMatched && !hasFilter(q)) return null
  if (!q.words.length) return 2
  const norm = item.norm.trim()
  const best = norm === q.text ? 0 : norm.startsWith(q.text) ? 1 : wordStarts ? 2 : 3
  return own < q.words.length ? Math.max(best, 2) : best
}

const KIND_ORDER: Record<HitKind, number> = { page: 0, h: 1, c: 2, p: 2 }
const LIMIT = 60

/** The best `limit` results, grouped by page in the order of each page's best result. `guideId` limits it to one guide. */
export function search(index: SearchIndex, input: string, guideId?: string, limit = LIMIT): { groups: Group[]; total: number } {
  const q = parseQuery(input)
  if (!q.words.length && !q.numbers.length && !hasFilter(q)) return { groups: [], total: 0 }
  const hits: Hit[] = []
  for (const item of index) {
    if (guideId && (item.kind === 'page' || item.node.id !== guideId)) continue
    if (!passesFilters(item, q)) continue
    const s = score(item, q)
    if (s !== null) hits.push({ ...item, score: s })
  }
  // Stable sort keeps guide order for ties.
  hits.sort((a, b) => a.score - b.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (b.stars ?? 0) - (a.stars ?? 0))
  const groups = new Map<string, Group>()
  for (const hit of hits.slice(0, limit)) {
    let group = groups.get(hit.node.id)
    if (!group) groups.set(hit.node.id, (group = { node: hit.node, trail: hit.trail, hits: [] }))
    if (hit.kind === 'page') group.page = hit
    else group.hits.push(hit)
  }
  return { groups: [...groups.values()], total: hits.length }
}

const bigrams = (w: string) => {
  const grams = new Set<string>()
  for (let i = 0; i < w.length - 1; i++) grams.add(w.slice(i, i + 2))
  return grams
}

/** Dice similarity of two words' letter pairs: 1 for the same pairs, 0 for none shared. */
export function similarity(a: string, b: string): number {
  const x = bigrams(a)
  const y = bigrams(b)
  if (!x.size || !y.size) return a === b ? 1 : 0
  let shared = 0
  for (const g of x) if (y.has(g)) shared++
  return (2 * shared) / (x.size + y.size)
}

const vocabularies = new WeakMap<SearchIndex, string[]>()
const vocabulary = (index: SearchIndex) => {
  let words = vocabularies.get(index)
  if (!words) vocabularies.set(index, (words = [...new Set(index.flatMap((i) => i.norm.split(' ')).filter((w) => w.length > 2))]))
  return words
}

/**
 * For a query that finds nothing, the same query with each word found nowhere swapped for the
 * closest word in the index ("lowdena" → "lowdina"), when that finds something.
 */
export function suggest(index: SearchIndex, input: string, guideId?: string): string | undefined {
  const words = vocabulary(index)
  let changed = false
  const tokens = input.trim().split(/\s+/).map((token) => {
    const w = normalise(token)
    if (w.length < 3 || /^[*★\d-]+$|^v\d+$/i.test(token) || words.includes(w)) return token
    let best = ''
    let bestScore = 0.5
    for (const candidate of words) {
      const s = similarity(w, candidate)
      if (s > bestScore) [best, bestScore] = [candidate, s]
    }
    if (!best) return token
    changed = true
    return best
  })
  const fixed = tokens.join(' ')
  return changed && search(index, fixed, guideId, 1).total > 0 ? fixed : undefined
}
