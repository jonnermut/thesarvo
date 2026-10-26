import type { IndexNode } from '#/guide/content/types'
import type { Gps, Guide } from '#/guide/model/types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** KML wants "lon,lat" pairs; the guide stores "lat,lon". */
const coordinates = (path: string) =>
  path
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split(',').reverse().join(','))
    .join(' ')

/** Placemarks for a GPS block's points, lines and areas. */
function placemarks(gps: Gps): string[] {
  const points = gps.points.map(
    (p) =>
      `<Placemark><name>${esc(p.description || p.code)}</name><Point><coordinates>${p.longitude},${p.latitude}</coordinates></Point></Placemark>`,
  )
  const shapes = gps.lines.map((l) => {
    const label = `<name>${esc(l.description)}</name>`
    if (l.shape === 'polyline') return `<Placemark>${label}<LineString><coordinates>${coordinates(l.path)}</coordinates></LineString></Placemark>`
    let ring = coordinates(l.path)
    if (l.shape === 'rectangle') {
      const [a, b] = l.path.split(/\s+/).map((p) => p.split(','))
      if (a?.length === 2 && b?.length === 2)
        ring = [[a[1], a[0]], [b[1], a[0]], [b[1], b[0]], [a[1], b[0]], [a[1], a[0]]].map((c) => c.join(',')).join(' ')
    }
    return `<Placemark>${label}<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`
  })
  return [...points, ...shapes]
}

const kmlDocument = (name: string, body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>${body}</Document></kml>\n`

/** Google Earth export of a guide's GPS block. */
export const gpsToKml = (name: string, gps: Gps) => kmlDocument(name, placemarks(gps).join(''))

/**
 * Every guide below `node`, as folders nested like the contents (the old site's `ts.kml?recursive=true`).
 * Undefined when nothing below has GPS.
 */
export async function treeToKml(node: IndexNode, guideOf: (id: string) => Promise<Guide | null>): Promise<string | undefined> {
  async function folder(n: IndexNode): Promise<string> {
    const guide = n.isGuide ? await guideOf(n.id) : null
    const own = guide?.nodes.flatMap((b) => (b.type === 'gps' ? placemarks(b) : [])) ?? []
    const below = (await Promise.all(n.children.map(folder))).filter(Boolean)
    return own.length || below.length ? `<Folder><name>${esc(n.title)}</name>${own.join('')}${below.join('')}</Folder>` : ''
  }
  const body = (await Promise.all(node.children.map(folder))).join('')
  return body ? kmlDocument(node.title || 'thesarvo', body) : undefined
}

/** Where the build puts the KML of everything below a contents page. */
export const treeKmlUrl = (id: string) => `/g-data/kml/${id}.kml`

/** The guide's name, taken from its header block. */
export const guideTitle = (guide: Guide) => guide.nodes.find((n) => n.type === 'header')?.name ?? ''
