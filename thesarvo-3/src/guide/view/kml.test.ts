import { describe, expect, it } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import type { Gps, Guide } from '#/guide/model/types'
import { gpsToKml, treeToKml } from './kml'

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
