import type { Gps, Guide } from '#/guide/model/types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** KML wants "lon,lat" pairs; the guide stores "lat,lon". */
const coordinates = (path: string) =>
  path
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split(',').reverse().join(','))
    .join(' ')

/** Google Earth export of a guide's GPS block: placemarks for points, lines and areas. */
export function gpsToKml(name: string, gps: Gps): string {
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>${[...points, ...shapes].join('')}</Document></kml>\n`
}

/** The guide's name, taken from its header block. */
export const guideTitle = (guide: Guide) => guide.nodes.find((n) => n.type === 'header')?.name ?? ''
