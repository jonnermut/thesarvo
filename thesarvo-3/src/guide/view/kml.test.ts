import { describe, expect, it } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import type { Gps, Guide } from '#/guide/model/types'
import { gpsToGpx, gpsToKml, kmlPoints, treeToGpx, treeToKml } from './kml'

const gps: Gps = {
  type: 'gps',
  id: '1',
  other: {},
  points: [{ pid: '0', code: 'A', description: 'Car & park', zone: '', easting: '', northing: '', latitude: '-42.1', longitude: '147.2', height: '' }],
  lines: [
    { shape: 'polyline', pid: '1', description: 'Track', path: '-42.1,147.1 -42.2,147.2' },
    { shape: 'rectangle', pid: '2', description: 'Box', path: '-42.1,147.1 -42.2,147.2' },
  ],
}

describe('gpsToKml', () => {
  it('writes lon,lat order and escapes names', () => {
    const kml = gpsToKml('Guide', gps)
    expect(kml).toContain('Car &amp; park')
    expect(kml).toContain('<coordinates>147.2,-42.1</coordinates>')
    expect(kml).toContain('147.1,-42.1 147.2,-42.2')
  })
  it('expands a rectangle to a closed ring', () => {
    expect(gpsToKml('Guide', gps)).toContain('147.1,-42.1 147.2,-42.1 147.2,-42.2 147.1,-42.2 147.1,-42.1')
  })
})

describe('treeToKml', () => {
  const node = (id: string, title: string, children: IndexNode[] = [], isGuide = true): IndexNode => ({ id, title, path: id, isGuide, children })
  const guides: Record<string, Guide> = { crag: { id: 'crag', nodes: [gps] } as Guide, bare: { id: 'bare', nodes: [] } as unknown as Guide }
  const guideOf = async (id: string) => guides[id] ?? null

  it('nests guides in folders like the contents and leaves out those without GPS', async () => {
    const tree = node('root', 'Guides', [node('south', 'South', [node('crag', 'The Crag'), node('bare', 'Bare')], false), node('north', 'North', [], false)], false)
    const kml = (await treeToKml(tree, guideOf))!
    expect(kml).toContain('<Folder><name>South</name><Folder><name>The Crag</name><Placemark>')
    expect(kml).not.toContain('Bare')
    expect(kml).not.toContain('North')
  })
  it('is undefined when nothing below has GPS', async () => {
    expect(await treeToKml(node('r', 'R', [node('bare', 'Bare')], false), guideOf)).toBeUndefined()
  })
})

describe('treeToGpx', () => {
  const node = (id: string, title: string, children: IndexNode[] = [], isGuide = true): IndexNode => ({ id, title, path: id, isGuide, children })
  const guideOf = async (id: string) => (id === 'crag' ? ({ id, nodes: [gps] } as Guide) : null)

  it('writes waypoints and tracks in lat, lon order with the guide as description', async () => {
    const gpx = (await treeToGpx(node('root', 'Guides', [node('south', 'South', [node('crag', 'The & Crag')], false)], false), guideOf))!
    expect(gpx).toContain('<wpt lat="-42.1" lon="147.2"><name>Car &amp; park</name><desc>The &amp; Crag</desc></wpt>')
    expect(gpx).toContain('<trkpt lat="-42.1" lon="147.1"/><trkpt lat="-42.2" lon="147.2"/>')
  })
  it('closes a rectangle into a ring', async () => {
    const gpx = (await treeToGpx(node('root', 'Guides', [node('crag', 'Crag')], false), guideOf))!
    expect(gpx).toContain('<trkpt lat="-42.1" lon="147.1"/><trkpt lat="-42.1" lon="147.2"/><trkpt lat="-42.2" lon="147.2"/><trkpt lat="-42.2" lon="147.1"/><trkpt lat="-42.1" lon="147.1"/>')
  })
  it('is undefined when nothing below has GPS', async () => {
    expect(await treeToGpx(node('r', 'R', [node('bare', 'Bare')], false), guideOf)).toBeUndefined()
  })
})

describe('gpsToGpx', () => {
  it('writes one guide with its name in each description', () => {
    const gpx = gpsToGpx('The & Crag', gps)
    expect(gpx).toContain('<metadata><name>The &amp; Crag</name></metadata>')
    expect(gpx).toContain('<wpt lat="-42.1" lon="147.2"><name>Car &amp; park</name><desc>The &amp; Crag</desc></wpt>')
  })
})

describe('kmlPoints', () => {
  it('gives every point of a guide folder, opening that guide', () => {
    const kml = '<kml><Document><Folder><name>Tasmania</name><Folder><name>Gordon Gorge</name><Placemark><name>A</name><Point><coordinates>146.1,-42.2</coordinates></Point></Placemark><Placemark><name>B</name><Point><coordinates>146.2,-42.3</coordinates></Point></Placemark></Folder></Folder></Document></kml>'
    const pts = kmlPoints(kml, new Map([['Gordon Gorge', 'g/1']]), new Map([['g/1', ['Tasmania', 'Gordon Gorge']]]))
    expect(pts.map((p) => [p.pid, p.description, p.latitude, p.longitude])).toEqual([['g/1#0', 'A', '-42.2', '146.1'], ['g/1#1', 'B', '-42.3', '146.2']])
    expect(pts[0].area).toEqual(['Tasmania', 'Gordon Gorge'])
  })
})
