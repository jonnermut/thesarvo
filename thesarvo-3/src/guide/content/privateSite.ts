import { canRead, privateAccess } from './access'
import type { AccessMap } from './access'
import type { IndexNode } from './types'

/** A private page (with the private pages below it that the user may read) to hang under `parent` in the public tree, in front of its sibling `before` (the next public one; null: last). */
export type Graft = { parent: string; before: string | null; node: IndexNode }

/**
 * The private pages a user may read, as subtrees to graft onto the public tree. `groups` is the user's Cognito groups,
 * null when signed out (nothing). A page the user may not read is left out with everything below it.
 */
export function readableGrafts(index: IndexNode, access: AccessMap, groups: readonly string[] | null): Graft[] {
  const hidden = privateAccess(index, access)
  const prune = (n: IndexNode): IndexNode | null => {
    const a = hidden.get(n.id)
    if (!a || !canRead(a, groups)) return null
    return { ...n, private: true, children: n.children.flatMap((c) => prune(c) ?? []) }
  }
  const out: Graft[] = []
  const walk = (n: IndexNode) => {
    n.children.forEach((c, i) => {
      if (hidden.has(c.id)) {
        const node = prune(c)
        if (node) out.push({ parent: n.id, before: n.children.slice(i + 1).find((s) => !hidden.has(s.id))?.id ?? null, node })
      } else walk(c)
    })
  }
  walk(index)
  return out
}

/** `public`: anyone; `allowed`: private and this user may read it; `denied`: private and they may not. */
export function pageDecision(index: IndexNode, access: AccessMap, id: string, groups: readonly string[] | null): 'public' | 'allowed' | 'denied' {
  const a = privateAccess(index, access).get(id)
  return !a ? 'public' : canRead(a, groups) ? 'allowed' : 'denied'
}

/** Hangs grafts under their parents in a copy of the tree, each in front of its `before` sibling (so private pages keep their place in the order). */
export function withGrafts(tree: IndexNode, grafts: readonly Graft[]): IndexNode {
  if (!grafts.length) return tree
  const add = (n: IndexNode): IndexNode => {
    const mine = grafts.filter((g) => g.parent === n.id)
    const children = n.children.map(add)
    for (const g of mine) {
      const at = g.before === null ? -1 : children.findIndex((c) => c.id === g.before)
      children.splice(at < 0 ? children.length : at, 0, g.node)
    }
    return { ...n, children }
  }
  return add(tree)
}
