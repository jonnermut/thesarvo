import type { Climb, Guide } from '#/guide/model/types'
import { routeStats } from '#/guide/view/routeStats'
import { findByPath, flatten } from './paths'
import type { IndexNode } from './types'

/** Summary of one guide, enough for counts in the tree and contents pages. */
export type GuideStats = {
  /** Climbs, or problems for a bouldering guide. */
  total: number
  problems: boolean
  /** Counts per grade band (see routeStats), lowest first. */
  bands: number[]
  sport: number
  /** Climbs with one, two and three stars. */
  stars: [number, number, number]
  topos: number
  gps: boolean
}

export type ManifestNode = { id: string; parent: string | null; title: string; path: string; isGuide: boolean; stats?: GuideStats }

/**
 * The whole site in one small file, fetched fresh after hydration, so the tree and counts stay
 * current without rebuilding every page. Nodes are flat, parents before children.
 */
export type Manifest = { version: 1; nodes: ManifestNode[] }

/** What a page needs to render on its own: itself, the way up, and a tree trimmed to its surroundings. */
export type PageInfo = { node: IndexNode; trail: IndexNode[]; tree: IndexNode }

export function guideStats(guide: Guide): GuideStats {
  const climbs = guide.nodes.filter((n): n is Climb => n.type === 'climb' || n.type === 'problem')
  const stats = routeStats(climbs)
  const counted = climbs.filter((c) => (c.type === 'problem') === stats.problems)
  const stars: GuideStats['stars'] = [0, 0, 0]
  for (const c of counted) {
    const n = c.stars.replace(/[^*]/g, '').length
    if (n) stars[Math.min(n, 3) - 1]++
  }
  return {
    total: stats.total,
    problems: stats.problems,
    bands: stats.bands.map((b) => b.trad + b.sport),
    sport: stats.bands.reduce((sum, b) => sum + b.sport, 0),
    stars,
    topos: guide.nodes.filter((n) => n.type === 'image').length,
    gps: guide.nodes.some((n) => n.type === 'gps' && (n.points.length > 0 || n.lines.length > 0)),
  }
}

export async function buildManifest(root: IndexNode, getGuide: (id: string) => Promise<Guide | null>): Promise<Manifest> {
  const nodes: ManifestNode[] = []
  const walk = async (n: IndexNode, parent: string | null) => {
    const guide = n.isGuide ? await getGuide(n.id) : null
    nodes.push({ id: n.id, parent, title: n.title, path: n.path, isGuide: n.isGuide, ...(guide && { stats: guideStats(guide) }) })
    for (const c of n.children) await walk(c, n.id)
  }
  await walk(root, null)
  return { version: 1, nodes }
}

/** Rebuilds the tree, with `count` on every node: climbs and problems in it and everything below. */
export function manifestTree(manifest: Manifest): IndexNode {
  const byId = new Map<string, IndexNode>()
  let root: IndexNode | undefined
  for (const m of manifest.nodes) {
    const node: IndexNode = { id: m.id, title: m.title, path: m.path, isGuide: m.isGuide, children: [], ...(m.stats && { stats: m.stats }) }
    byId.set(m.id, node)
    if (m.parent === null) root = node
    else byId.get(m.parent)?.children.push(node)
  }
  if (!root) throw new Error('Manifest has no root')
  const count = (n: IndexNode): number => (n.count = (n.stats?.total ?? 0) + n.children.reduce((sum, c) => sum + count(c), 0))
  count(root)
  return root
}

/**
 * The page's node, its ancestors, and a copy of the tree holding only the ancestors, their
 * children and the page's own children. Branches left out are marked `more`, so the sidebar
 * can still show them as expandable before the full tree arrives.
 */
export function pageInfo(root: IndexNode, path: string): PageInfo | null {
  const node = findByPath(root, path)
  if (!node) return null
  const trail = flatten(root).filter((n) => n !== node && (n.path === '' || path.startsWith(`${n.path}/`)))
  const keep = new Set([...trail, node])
  const trim = (n: IndexNode): IndexNode => {
    const { children, ...rest } = n
    if (keep.has(n)) return { ...rest, children: children.map(trim) }
    return { ...rest, children: [], ...(children.length > 0 && { more: true }) }
  }
  const strip = ({ children: _, ...rest }: IndexNode): IndexNode => ({ ...rest, children: [] })
  return { node: { ...strip(node), children: node.children.map(trim) }, trail: trail.map(strip), tree: trim(root) }
}
