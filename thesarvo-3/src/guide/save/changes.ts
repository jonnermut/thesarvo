import type { Guide, GuideNode, ImageTopo } from '#/guide/model/types'
import { autonumber, nextId } from '#/guide/edit/state'

/** One node's change: as it was and as it is now. Null means not there (added, or deleted). */
export type NodeChange = { id: string; before: GuideNode | null; after: GuideNode | null }

/** What one save sends: the changed nodes, the order of nodes (when it changed) and the guide's own field. */
export type Changes = {
  nodes: NodeChange[]
  order?: { before: string[]; after: string[] }
  guideStars?: { before: string; after: string }
}

/** Two people changed the same node: theirs is what the guide holds now, mine what this save wanted. */
export type Conflict = { id: string; theirs: GuideNode | null; mine: GuideNode | null }

/** JSON with keys sorted and undefined left out, so equal nodes compare equal whatever their key order. */
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v,
  )

export const same = (a: unknown, b: unknown) => a === b || canonical(a) === canonical(b)

/** Each node's key: its id, or for the rare element the model does not know, its place among those. */
export function nodeKeys(guide: Guide): string[] {
  let unknown = 0
  return guide.nodes.map((n) => (n.type === 'unknown' ? `unknown:${unknown++}` : n.id))
}

export const nodesByKey = (guide: Guide) => {
  const keys = nodeKeys(guide)
  return new Map(keys.map((k, i) => [k, guide.nodes[i]]))
}

/**
 * Gives every node a unique id. 171 nodes in the imported guides have none and 9 guides repeat ids; saving node
 * by node needs them unique. Deterministic, so the browser and the server number a guide the same way.
 */
export function ensureIds(guide: Guide): Guide {
  const seen = new Set<string>()
  let next = Number(nextId(guide))
  let changed = false
  const nodes = guide.nodes.map((n) => {
    if (n.type === 'unknown') return n
    if (n.id && !seen.has(n.id)) {
      seen.add(n.id)
      return n
    }
    changed = true
    const id = String(next++)
    seen.add(id)
    return { ...n, id }
  })
  return changed ? { ...guide, nodes } : guide
}

/** What changed from `base` to `next`, node by node. */
export function diffGuides(base: Guide, next: Guide): Changes {
  const before = nodesByKey(base)
  const after = nodesByKey(next)
  const nodes: NodeChange[] = []
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(id) ?? null
    const a = after.get(id) ?? null
    if (!same(b, a)) nodes.push({ id, before: b, after: a })
  }
  const changes: Changes = { nodes }
  const [orderBefore, orderAfter] = [[...before.keys()], [...after.keys()]]
  if (orderBefore.join('\n') !== orderAfter.join('\n')) changes.order = { before: orderBefore, after: orderAfter }
  if (base.guideStars !== next.guideStars) changes.guideStars = { before: base.guideStars, after: next.guideStars }
  return changes
}

export const isEmpty = (c: Changes) => !c.nodes.length && !c.order && !c.guideStars

/** A topo's references to climbs, renamed. */
const renameRefs = (node: GuideNode, rename: Record<string, string>): GuideNode =>
  node.type === 'image'
    ? ({
        ...node,
        legend: node.legend.map((id) => rename[id] ?? id),
        paths: node.paths.map((p) => (rename[p.linkedTo] ? { ...p, linkedTo: rename[p.linkedTo] } : p)),
      } satisfies ImageTopo)
    : node

/** The same changes with node ids renamed (after the server gave added nodes new ids). */
export function renameChanges(changes: Changes, rename: Record<string, string>): Changes {
  if (!Object.keys(rename).length) return changes
  const node = (n: GuideNode | null, id: string) => n && renameRefs(n.type === 'unknown' ? n : { ...n, id }, rename)
  return {
    ...changes,
    nodes: changes.nodes.map((c) => {
      const id = rename[c.id] ?? c.id
      return { id, before: c.before && renameRefs(c.before, rename), after: node(c.after, id) }
    }),
    order: changes.order && { before: changes.order.before, after: changes.order.after.map((id) => rename[id] ?? id) },
  }
}

/** Ids in `list` that are also in `other`, in `list`'s order. */
const common = (list: string[], other: string[]) => {
  const set = new Set(other)
  return list.filter((id) => set.has(id))
}

/**
 * The order of the merged guide's nodes (`keep`). If this save moved nodes, its order wins and nodes added since
 * slot in after their neighbour; otherwise the current order stays and this save's new nodes slot in.
 */
export function mergeOrder(current: string[], before: string[], after: string[], keep: Set<string>): string[] {
  const moved = common(before, after).join('\n') !== common(after, before).join('\n')
  const [primary, secondary] = moved ? [after, current] : [current, after]
  const result = primary.filter((id) => keep.has(id))
  const placed = new Set(result)
  const inSecondary = new Set(secondary)
  secondary.forEach((id, i) => {
    if (!keep.has(id) || placed.has(id)) return
    // After its neighbour, and after anything the other side put there that this side does not know.
    const previous = secondary.slice(0, i).findLast((p) => placed.has(p))
    let at = previous === undefined ? 0 : result.indexOf(previous) + 1
    while (at < result.length && !inSecondary.has(result[at])) at++
    result.splice(at, 0, id)
    placed.add(id)
  })
  for (const id of keep) if (!placed.has(id)) result.push(id)
  return result
}

export type Merged = { guide: Guide; conflicts: Conflict[]; rename: Record<string, string> }

/**
 * Applies a save's changes to the guide as it is now. A node applies when it is still as the save last saw it (or
 * already as the save wants it); otherwise someone else changed it too, a conflict, unless `mineWins`. Two saves that
 * each added a node with the same id keep both: this save's gets a new id (`rename`).
 */
export function mergeChanges(current: Guide, changes: Changes, mineWins = false): Merged {
  const nodes = nodesByKey(current)
  const conflicts: Conflict[] = []
  const rename: Record<string, string> = {}
  let next = Number(nextId({ ...current, nodes: [...current.nodes, ...changes.nodes.flatMap((c) => (c.after ? [c.after] : []))] }))
  const applied: string[] = []
  for (const c of changes.nodes) {
    const now = nodes.get(c.id) ?? null
    if (c.before === null && c.after && now && !same(now, c.after) && c.after.type !== 'unknown') {
      const id = String(next++)
      rename[c.id] = id
      nodes.set(id, { ...c.after, id })
      applied.push(id)
    } else if (mineWins || same(now, c.before) || same(now, c.after)) {
      if (c.after) nodes.set(c.id, c.after)
      else nodes.delete(c.id)
      applied.push(c.id)
    } else conflicts.push({ id: c.id, theirs: now, mine: c.after })
  }
  if (Object.keys(rename).length)
    for (const id of applied) {
      const node = nodes.get(id)
      if (node) nodes.set(id, renameRefs(node, rename))
    }
  const orderNow = nodeKeys(current)
  const order = changes.order
    ? mergeOrder(orderNow, changes.order.before, changes.order.after.map((id) => rename[id] ?? id), new Set(nodes.keys()))
    : mergeOrder(orderNow, orderNow, orderNow, new Set(nodes.keys()))
  const stars = changes.guideStars
  const guide = autonumber({
    ...current,
    guideStars: stars && (mineWins || current.guideStars === stars.before) ? stars.after : current.guideStars,
    nodes: order.flatMap((id) => nodes.get(id) ?? []),
  })
  return { guide, conflicts, rename }
}
