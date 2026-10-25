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

/** Set when the site is built as static files: images then come from object storage, saving is off. */
export const STATIC_SITE = import.meta.env?.VITE_STATIC_SITE === '1'
const IMAGE_BASE = (import.meta.env?.VITE_IMAGE_BASE as string | undefined)?.replace(/\/$/, '')

/**
 * Image URL. In development files are served by the content route, stored lower-case as
 * `<id>-<name>` (thumbnails `<id>-t-<name>`); in the static site they are `images/<id>/<name>`.
 */
export const imageUrl = (guideId: string, name: string, thumb = false) =>
  IMAGE_BASE
    ? `${IMAGE_BASE}/${guideId}/${encodeURIComponent(name)}`
    : `${GUIDE_PREFIX}/content?f=${encodeURIComponent(`${guideId}-${thumb ? 't-' : ''}${name}`.toLowerCase())}`

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024

/** Picks the stored name for an upload: a plain lower-case file name with a known image extension, or null. */
export function uploadName(fileName: string): string | null {
  const base = (fileName.split(/[\\/]/).pop() ?? '').trim().toLowerCase().replace(/[^a-z0-9 ._()-]+/g, '_')
  const match = /^(.*?)\.(jpe?g|png|gif)$/.exec(base)
  return match?.[1] ? base : null
}
