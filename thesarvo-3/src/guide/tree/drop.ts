import type { StoredIndexNode } from '#/guide/content/syncFeed'

/** Where on a row a page is dropped: above it, onto it (as its last child) or below it. */
export type Zone = 'above' | 'into' | 'below'

/** Which part of a row of `height` the pointer `y` (from the row's top) is in: the top quarter, the bottom quarter, else onto the row. */
export const zoneAt = (y: number, height: number): Zone => (y < height / 4 ? 'above' : y > (height * 3) / 4 ? 'below' : 'into')

const find = (n: StoredIndexNode, id: string): { node: StoredIndexNode; parent: StoredIndexNode | null } | null => {
  if (n.id === id) return { node: n, parent: null }
  for (const c of n.children) {
    const hit = find(c, id)
    if (hit) return { node: hit.node, parent: hit.parent ?? n }
  }
  return null
}

const within = (n: StoredIndexNode, id: string): boolean => n.id === id || n.children.some((c) => within(c, id))

/** The place a drop means, as a new parent and a position among its other children (what the server's move takes); null when it is not allowed or changes nothing. */
export function dropPlace(tree: StoredIndexNode, drag: string, over: string, zone: Zone): { parent: string; position: number } | null {
  const dragged = find(tree, drag)
  const target = find(tree, over)
  // The top of the tree stays, and a page cannot go onto itself or into its own pages.
  if (!dragged?.parent || !target || within(dragged.node, over)) return null
  let parent: string
  let position: number
  if (zone === 'into') {
    parent = over
    position = target.node.children.filter((c) => c.id !== drag).length
  } else {
    // Above or below the top of the tree is not a place.
    if (!target.parent) return null
    parent = target.parent.id
    const others = target.parent.children.filter((c) => c.id !== drag)
    position = others.findIndex((c) => c.id === over) + (zone === 'below' ? 1 : 0)
  }
  const now = dragged.parent
  if (now.id === parent && now.children.findIndex((c) => c.id === drag) === position) return null
  return { parent, position }
}

/** The moves the arrow buttons make: up or down among the siblings, out to the parent's level (after the parent), in under the sibling above (as its last child). */
export function stepPlace(tree: StoredIndexNode, id: string, step: 'up' | 'down' | 'out' | 'in'): { parent: string; position: number } | null {
  const hit = find(tree, id)
  if (!hit?.parent) return null
  const sibs = hit.parent.children
  const at = sibs.findIndex((c) => c.id === id)
  if (step === 'up') return at > 0 ? { parent: hit.parent.id, position: at - 1 } : null
  if (step === 'down') return at < sibs.length - 1 ? { parent: hit.parent.id, position: at + 1 } : null
  if (step === 'in') return at > 0 ? { parent: sibs[at - 1].id, position: sibs[at - 1].children.length } : null
  const grand = find(tree, hit.parent.id)?.parent
  return grand ? { parent: grand.id, position: grand.children.findIndex((c) => c.id === hit.parent!.id) + 1 } : null
}
