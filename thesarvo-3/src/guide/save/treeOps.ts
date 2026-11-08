// Pure changes to the page tree: shared by the server's save and the tree page in the browser.
import { isHiddenPage, slugify } from '#/guide/content/paths'
import type { StoredIndexNode } from '#/guide/content/syncFeed'

/** Old address (path without the /g prefix) to the id of the page that has it now, kept in `moved.json` of the content repo. */
export type Moved = Record<string, string>

export const flat = (n: StoredIndexNode): StoredIndexNode[] => [n, ...n.children.flatMap(flat)]

/** The address of every page, as the site makes it from the titles (siblings that slugify the same get their id added). */
export function pathsOf(index: StoredIndexNode): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (n: StoredIndexNode, path: string) => {
    out.set(n.id, path)
    const seen = new Set<string>()
    for (const c of n.children.filter((k) => !isHiddenPage(k.title))) {
      let slug = slugify(c.title) || c.id
      if (seen.has(slug)) slug = `${slug}-${c.id}`
      seen.add(slug)
      walk(c, path ? `${path}/${slug}` : slug)
    }
  }
  walk(index, '')
  return out
}

/** Redirects for the addresses `before` had that `after` does not: old address to page id. Addresses in use again are dropped from `moved`. */
export function withMoved(moved: Moved, before: StoredIndexNode, after: StoredIndexNode): Moved {
  const was = pathsOf(before)
  const now = pathsOf(after)
  const next: Moved = { ...moved }
  for (const [id, path] of now) {
    const old = was.get(id)
    if (old && old !== path) next[old] = id
  }
  const live = new Set(now.values())
  for (const path of Object.keys(next)) if (live.has(path) || !now.has(next[path])) delete next[path]
  return next
}

export const withTitle = (index: StoredIndexNode, id: string, title: string): StoredIndexNode | null => {
  let found = false
  const walk = (n: StoredIndexNode): StoredIndexNode => {
    if (n.id === id) return (found = true), { ...n, title }
    return { ...n, children: n.children.map(walk) }
  }
  const next = walk(index)
  return found ? next : null
}

/**
 * The page with its pages under it taken out and put back as child number `position` of `parent` (counted without it, so a move within
 * a parent to the end is the number of its other children). Null when either page is missing, the page is the top of the tree, or the
 * new parent is the page itself or under it.
 */
export function withMovedPage(index: StoredIndexNode, id: string, parent: string, position: number): StoredIndexNode | null {
  if (index.id === id) return null
  const page = flat(index).find((n) => n.id === id)
  if (!page || !flat(index).some((n) => n.id === parent) || flat(page).some((n) => n.id === parent)) return null
  const walk = (n: StoredIndexNode): StoredIndexNode => {
    const children = n.children.filter((c) => c.id !== id).map(walk)
    if (n.id === parent) children.splice(Math.min(position, children.length), 0, page)
    return { ...n, children }
  }
  return walk(index)
}

/** Whether two trees hold the same pages (what undo needs: pages added or deleted since must not be lost). */
export const sameIds = (a: StoredIndexNode, b: StoredIndexNode) => {
  const ids = (n: StoredIndexNode) => flat(n).map((x) => x.id).sort().join(',')
  return a.id === b.id && ids(a) === ids(b)
}

