import { guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'
import type { Guide } from '#/guide/model/types'
import { nodeAnchors } from '#/guide/view/contents'

export type PageTarget = { node: IndexNode; where: string }
export type PlaceTarget = { kind: 'climb' | 'topo'; label: string; href: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Pages whose title contains every word typed (titles that start with the text first), each with the pages above it, for telling same-named pages apart. */
export function findPages(root: IndexNode, query: string, limit = 8): PageTarget[] {
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return []
  const hits: (PageTarget & { rank: number })[] = []
  const walk = (node: IndexNode, above: string[]) => {
    if (node.path) {
      const title = norm(node.title)
      if (words.every((w) => title.includes(w))) hits.push({ node, where: above.join(' › '), rank: title.startsWith(words.join(' ')) ? 0 : 1 })
    }
    for (const c of node.children) walk(c, node.path ? [...above, node.title] : above)
  }
  walk(root, [])
  return hits.sort((a, b) => a.rank - b.rank || a.node.title.length - b.node.title.length).slice(0, limit)
}

/** The places in a guide a link can point at: each climb and each topo, by the anchors the guide page gives them. */
export function guidePlaces(node: IndexNode, guide: Guide): PlaceTarget[] {
  const anchors = nodeAnchors(guide.nodes)
  const climbs = new Map(guide.nodes.flatMap((n): [string, string][] => (n.type === 'climb' || n.type === 'problem' ? [[n.id, n.name]] : [])))
  return guide.nodes.flatMap((n, i): PlaceTarget[] => {
    const anchor = anchors[i]
    if (!anchor) return []
    if (n.type === 'climb' || n.type === 'problem') return [{ kind: 'climb', label: `${n.number ? `${n.number} ` : ''}${n.name}${n.grade ? ` ${n.grade}` : ''}`.trim(), href: `${guideUrl(node)}#${anchor}` }]
    if (n.type === 'image') {
      const first = n.legend.map((id) => climbs.get(id)).find(Boolean)
      return [{ kind: 'topo', label: first ? `Topo of ${first}…` : 'Topo', href: `${guideUrl(node)}#${anchor}` }]
    }
    return []
  })
}
