/** Grouping and naming the pins of a zoomed-out map (the iOS Map tab does the same). */

export type Pin = { id: string; lat: number; lng: number; /** The guide's area chain from the top of the tree, ending at the crag's own name. */ area: string[] }
export type Cluster = { pins: Pin[]; name: string; lat: number; lng: number }

/** Closer in than this latitude span (degrees) every pin shows alone. */
export const CLUSTER_SPAN = 0.06

/** "Bouldering" is a section of regions, so a boulder crag's chain reads "<Region> bouldering" rather than all saying "Bouldering". */
export function placeChain(area: string[]): string[] {
  const i = area.indexOf('Bouldering')
  return i >= 0 && area[i + 1] ? [`${area[i + 1]} bouldering`, ...area.slice(i + 2)] : area
}

/** One pin per spot (coordinates to 4 decimals, about 11 m), keeping the most specific guide's: the deepest in the tree. */
export function dedupe(pins: Pin[]): Pin[] {
  const best = new Map<string, Pin>()
  for (const p of pins) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    const old = best.get(key)
    if (!old || p.area.length > old.area.length) best.set(key, p)
  }
  return [...best.values()]
}

const tally = (names: string[]) => {
  const counts = new Map<string, number>()
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1)
  // Biggest first; ties to the alphabetical first.
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/**
 * Four distinct places or fewer: the biggest place's name and how many others ("Gordon Gorge +3").
 * More: the deepest area they all share, else the most common top-level area.
 */
export function clusterName(pins: Pin[]): string {
  const chains = pins.map((p) => placeChain(p.area))
  // A place is a whole chain, so two crags of the same name under different areas are two places.
  const groups = new Map<string, { name: string; count: number }>()
  for (const c of chains) {
    const key = c.join('\u0000')
    groups.set(key, { name: c[c.length - 1] ?? '', count: (groups.get(key)?.count ?? 0) + 1 })
  }
  const places = [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  if (places.length <= 4) return places.length > 1 ? `${places[0].name} +${places.length - 1}` : places[0].name
  const first = chains[0]
  let shared = 0
  while (shared < first.length && chains.every((c) => c[shared] === first[shared])) shared++
  return shared ? first[shared - 1] : tally(chains.map((c) => c[0] ?? ''))[0][0]
}

/** Pins closer than `cell` pixels (on a grid, in screen space) become one cluster named for where it covers. */
export function clusterPins(pins: Pin[], project: (p: Pin) => { x: number; y: number }, cell: number): Cluster[] {
  const cells = new Map<string, Pin[]>()
  for (const p of pins) {
    const { x, y } = project(p)
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`
    cells.set(key, [...(cells.get(key) ?? []), p])
  }
  return [...cells.values()].map((group) => ({
    pins: group,
    name: group.length > 1 ? clusterName(group) : group[0].area[group[0].area.length - 1] ?? '',
    lat: group.reduce((s, p) => s + p.lat, 0) / group.length,
    lng: group.reduce((s, p) => s + p.lng, 0) / group.length,
  }))
}
