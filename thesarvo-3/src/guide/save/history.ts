import type { Guide, GuideNode, Header } from '#/guide/model/types'
import { nodesByKey, same } from './changes'
import type { Changes } from './changes'

/** One editing session on a guide: everything one person changed in it, net, and what that was in words. */
export type HistoryEntry = {
  session: string
  user: { sub: string; name: string }
  /** ISO times of the session's first and last save. */
  start: string
  end: string
  saves: number
  /** Each changed node as it was before the session and as it is after it. Null means not there. */
  nodes: Record<string, { before: GuideNode | null; after: GuideNode | null }>
  order?: { before: string[]; after: string[] }
  guideStars?: { before: string; after: string }
  /** For a plain page (not a guide), once those can be edited: its HTML before and after the session. */
  body?: { before: string; after: string }
  /** e.g. "edited the climb Albatros", "added 4 climbs and a topo". */
  description: string
  note?: string
}

/** `guide` is the guide after the save, to name blocks that only moved. */
export type SaveInfo = { session: string; user: { sub: string; name: string }; at: string; changes: Changes; guide: Guide; note?: string }

/** The history with a save folded into its session's entry (a new entry for a new session). Newest last. */
export function updateHistory(history: HistoryEntry[], save: SaveInfo): HistoryEntry[] {
  const at = history.findLastIndex((e) => e.session === save.session && e.user.sub === save.user.sub)
  const old = at >= 0 ? history[at] : undefined
  const nodes = { ...old?.nodes }
  // With "Auto number" on, adding a climb renumbers every one after it: not worth keeping.
  const autonumbered = save.guide.nodes.some((n) => n.type === 'header' && n.autonumber === 'true')
  for (const c of save.changes.nodes) {
    if (autonumbered && !(c.id in nodes) && c.before && c.after && changedFields(c.before, c.after).every((f) => f === 'number')) continue
    const before = c.id in nodes ? nodes[c.id].before : c.before
    if (same(before, c.after)) delete nodes[c.id]
    else nodes[c.id] = { before, after: c.after }
  }
  const net = <T>(was: { before: T; after: T } | undefined, now: { before: T; after: T } | undefined) => {
    if (!now) return was
    const before = was ? was.before : now.before
    return same(before, now.after) ? undefined : { before, after: now.after }
  }
  const order = net(old?.order, save.changes.order)
  const guideStars = net(old?.guideStars, save.changes.guideStars)
  const rest = history.filter((_, i) => i !== at)
  if (!Object.keys(nodes).length && !order && !guideStars) return rest
  const entry: HistoryEntry = {
    session: save.session,
    user: { sub: save.user.sub, name: save.user.name || old?.user.name || '' },
    start: old?.start ?? save.at,
    end: save.at,
    saves: (old?.saves ?? 0) + 1,
    nodes,
    ...(order && { order }),
    ...(guideStars && { guideStars }),
    description: describe(nodes, order, guideStars, nodesByKey(save.guide)),
    ...((save.note || old?.note) && { note: save.note || old?.note }),
  }
  return at >= 0 ? history.toSpliced(at, 1, entry) : [...history, entry]
}

/** Nodes in both lists, minus the longest run they keep in the same order: the ones that moved. */
export function movedIds(before: string[], after: string[]): string[] {
  const inAfter = new Set(after)
  const inBefore = new Set(before)
  const a = before.filter((id) => inAfter.has(id))
  const b = after.filter((id) => inBefore.has(id))
  // Longest common subsequence, by table: guides have a few hundred nodes at most.
  const len = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) len[i][j] = a[i] === b[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1])
  const kept = new Set<string>()
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      kept.add(a[i])
      i++
      j++
    } else if (len[i + 1][j] >= len[i][j + 1]) i++
    else j++
  }
  return b.filter((id) => !kept.has(id))
}

type Kind = { one: string; many: string }
const kinds = {
  climb: { one: 'climb', many: 'climbs' },
  problem: { one: 'problem', many: 'problems' },
  heading: { one: 'heading', many: 'headings' },
  text: { one: 'text block', many: 'text blocks' },
  topo: { one: 'topo', many: 'topos' },
  photo: { one: 'photo', many: 'photos' },
  gps: { one: 'GPS block', many: 'GPS blocks' },
  header: { one: 'header', many: 'headers' },
  unknown: { one: 'block', many: 'blocks' },
} satisfies Record<string, Kind>

const kindOf = (n: GuideNode): Kind => {
  switch (n.type) {
    case 'text':
      return n.cls.startsWith('heading') ? kinds.heading : kinds.text
    case 'image':
      return n.paths.length ? kinds.topo : kinds.photo
    default:
      return kinds[n.type]
  }
}

const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

/** "the climb Albatros", "a topo", "the header". */
function label(n: GuideNode): string {
  const kind = kindOf(n).one
  const name = n.type === 'climb' || n.type === 'problem' ? plain(n.name) : n.type === 'text' && kind === 'heading' ? plain(n.text) : ''
  if (name) return `the ${kind} ${name.length > 40 ? `${name.slice(0, 40)}…` : name}`
  return n.type === 'header' || n.type === 'gps' ? `the ${kind}` : `a ${kind}`
}

/** "a, b and c". */
const list = (items: string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/** Two or fewer named, more counted by kind: "the climb Albatros and a topo", "4 climbs and a topo". */
function some(nodes: GuideNode[]): string {
  if (nodes.length <= 2) return list(nodes.map(label))
  const counts = new Map<Kind, number>()
  for (const n of nodes) counts.set(kindOf(n), (counts.get(kindOf(n)) ?? 0) + 1)
  return list([...counts].map(([k, count]) => (count === 1 ? `a ${k.one}` : `${count} ${k.many}`)))
}

const headerFields: [keyof Header, string][] = [
  ['name', 'the crag name'],
  ['intro', 'the intro'],
  ['history', 'the history'],
  ['access', 'the access notes'],
  ['steward', 'the crag steward'],
  ['camping', 'the camping notes'],
  ['walk', 'the walk'],
  ['sun', 'the sun'],
  ['rock', 'the rock'],
  ['acknowledgement', 'the acknowledgement'],
  ['autonumber', 'the numbering'],
]

/** Fields that differ between two nodes. */
const changedFields = (a: GuideNode, b: GuideNode) => {
  const [x, y] = [new Map(Object.entries(a)), new Map(Object.entries(b))]
  return [...new Set([...x.keys(), ...y.keys()])].filter((k) => !same(x.get(k), y.get(k)))
}

/** One edited node in words, or null to fall back to "edited the climb X". */
function editPhrase(before: GuideNode, after: GuideNode): string | null {
  const fields = changedFields(before, after)
  if (after.type === 'header' && before.type === 'header') {
    const named = headerFields.filter(([k]) => fields.includes(k)).map(([, words]) => words)
    return named.length && named.length <= 2 && named.length === fields.length ? `edited ${list(named)}` : null
  }
  if ((after.type === 'climb' || after.type === 'problem') && (before.type === 'climb' || before.type === 'problem') && fields.length === 1) {
    const name = plain(after.name) || `the ${kindOf(after).one}`
    if (fields[0] === 'grade') return `changed the grade of ${name} from ${before.grade || 'none'} to ${after.grade || 'none'}`
    if (fields[0] === 'stars') return `changed the stars of ${name} from ${before.stars || 'none'} to ${after.stars || 'none'}`
  }
  return null
}

/** A session's changes in words: added, edited, deleted, then moved. */
export function describe(nodes: HistoryEntry['nodes'], order?: HistoryEntry['order'], guideStars?: HistoryEntry['guideStars'], guide = new Map<string, GuideNode>()): string {
  const added: GuideNode[] = []
  const deleted: GuideNode[] = []
  const edited: [GuideNode, GuideNode][] = []
  for (const { before, after } of Object.values(nodes)) {
    if (!before && after) added.push(after)
    else if (before && !after) deleted.push(before)
    // A climb renumbered by "Auto number" only is not an edit worth telling.
    else if (before && after && changedFields(before, after).some((f) => f !== 'number')) edited.push([before, after])
  }
  const clauses: string[] = []
  if (added.length) clauses.push(`added ${some(added)}`)
  if (edited.length === 1) clauses.push(editPhrase(...edited[0]) ?? `edited ${label(edited[0][1])}`)
  else if (edited.length) clauses.push(`edited ${some(edited.map(([, a]) => a))}`)
  if (guideStars) clauses.push(`changed the guide's stars`)
  if (deleted.length) clauses.push(`deleted ${some(deleted)}`)
  const moved = order ? movedIds(order.before, order.after) : []
  const movedNodes = moved.flatMap((id) => nodes[id]?.after ?? guide.get(id) ?? [])
  if (moved.length) clauses.push(`moved ${movedNodes.length === moved.length ? some(movedNodes) : moved.length === 1 ? 'a block' : `${moved.length} blocks`}`)
  return list(clauses) || 'made no changes'
}
