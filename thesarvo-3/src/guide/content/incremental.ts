import { flatten } from './paths'
import type { IndexNode } from './types'

/** Per page: its content (guide and prose), its place in the tree (title, path, parent, kind), and its children's ids. */
export type NodeHashes = [body: string, place: string, kids: string]

/**
 * What a deployed static site was built from, at `g-data/build.json`, so the next build can redo
 * only what changed. `app` names the app's code; a different one needs a full build.
 */
export type BuildInfo = { app: string; content: string; contentAt?: string; nodes: Record<string, NodeHashes> }

export async function treeHashes(root: IndexNode, bodyOf: (node: IndexNode) => Promise<string>, hash: (s: string) => string): Promise<Record<string, NodeHashes>> {
  const out: Record<string, NodeHashes> = {}
  const walk = async (n: IndexNode, parent: IndexNode | null): Promise<void> => {
    out[n.id] = [hash(await bodyOf(n)), hash(JSON.stringify([n.title, n.path, parent?.id ?? null, n.isGuide])), hash(n.children.map((c) => c.id).join(','))]
    for (const c of n.children) await walk(c, n)
  }
  await walk(root, null)
  return out
}

/**
 * The pages whose built HTML is out of date. A page shows its own content, its children (two
 * levels, in its contents view), and the titles of its ancestors and their children (breadcrumbs
 * and the sidebar's first tree). So:
 * - content changed: the page itself;
 * - children changed: the page and its children;
 * - new, renamed, moved: the page, everything below it, its parent and siblings, and its grandparent.
 * Pages further away pick up the change from the manifest after loading.
 */
export function pagesToRebuild(root: IndexNode, prev: Record<string, NodeHashes>, next: Record<string, NodeHashes>): IndexNode[] {
  const parent = new Map<IndexNode, IndexNode>()
  for (const n of flatten(root)) for (const c of n.children) parent.set(c, n)
  const out = new Set<IndexNode>()
  const add = (...nodes: (IndexNode | undefined)[]) => nodes.forEach((n) => n && out.add(n))
  for (const n of flatten(root)) {
    const [body, place, kids] = next[n.id] ?? []
    const was = prev[n.id]
    if (!was || was[1] !== place) {
      const p = parent.get(n)
      add(...flatten(n), p, ...(p?.children ?? []), p && parent.get(p))
      continue
    }
    if (was[0] !== body) add(n)
    if (was[2] !== kids) add(n, ...n.children)
  }
  return flatten(root).filter((n) => out.has(n))
}
