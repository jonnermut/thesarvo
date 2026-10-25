import type { IndexNode } from './types'

/** The URL prefix guides live under. */
export const GUIDE_PREFIX = '/g'

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const guideUrl = (node: Pick<IndexNode, 'path'>) => `${GUIDE_PREFIX}/${node.path}`

/** Depth-first list of every node, parents before children. */
export function flatten(node: IndexNode): IndexNode[] {
  return [node, ...node.children.flatMap(flatten)]
}

export const findByPath = (root: IndexNode, path: string) => flatten(root).find((n) => n.path === path)

/** Ids from the root down to the node with `path`, used to expand the sidebar. */
export function ancestorIds(root: IndexNode, path: string): string[] {
  const walk = (n: IndexNode, trail: string[]): string[] | null => {
    if (n.path === path) return trail
    for (const child of n.children) {
      const found = walk(child, [...trail, n.id])
      if (found) return found
    }
    return null
  }
  return walk(root, []) ?? []
}

/**
 * Image URL as served by the content route. Files are stored lower-case as
 * `<id>-<name>`, thumbnails as `<id>-t-<name>`.
 */
export const imageUrl = (guideId: string, name: string, thumb = false) =>
  `/content?f=${encodeURIComponent(`${guideId}-${thumb ? 't-' : ''}${name}`.toLowerCase())}`
