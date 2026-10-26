import type { Climb, GuideNode, ImageTopo } from '#/guide/model/types'

const isClimb = (n: GuideNode): n is Climb => n.type === 'climb' || n.type === 'problem'
const isHeading = (n: GuideNode) => n.type === 'text' && /^heading/.test(n.cls)

/**
 * What a topo at `at` covers: the blocks after it up to the next topo or heading, as guides lay
 * them out (photo, maybe a note, then its climbs). `insertAt` is where a climb added from the topo
 * goes: after the section's last climb, or after the topo and its notes when it has none yet.
 */
export function topoSection(nodes: GuideNode[], at: number): { climbs: Climb[]; insertAt: number } {
  let end = at + 1
  while (end < nodes.length && nodes[end].type !== 'image' && !isHeading(nodes[end])) end++
  const climbs: Climb[] = []
  let insertAt = end
  for (let i = at + 1; i < end; i++) {
    const n = nodes[i]
    if (isClimb(n)) {
      climbs.push(n)
      insertAt = i + 1
    }
  }
  return { climbs, insertAt }
}

/**
 * A legend not worth showing: the old site drew a topo's legend only when its `legend` flag was set,
 * and without one the climbs the guide lists straight after the photo already say the same.
 */
export function legendRedundant(topo: ImageTopo, section: Climb[]): boolean {
  const { legend } = topo
  if (!legend.length || topo.other?.legend === 'true' || topo.legendTitle || topo.legendFooter) return false
  const first = new Set(section.slice(0, legend.length).map((c) => c.id))
  return legend.every((id) => first.has(id))
}
