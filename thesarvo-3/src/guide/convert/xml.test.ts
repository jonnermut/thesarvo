import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { formatPoints, guideFromXml, guideToXml, parsePoints } from './xml'

const fixture = (id: string) => readFileSync(`fixtures/${id}.xml`, 'utf8')

describe('points', () => {
  it('parses coordinates and an optional type on the last point', () => {
    const points = parsePoints('151.0,556.0, 150.0,555.5, 216.0,150.0,belay')
    expect(points).toEqual([
      { x: 151, y: 556, kind: '' },
      { x: 150, y: 555.5, kind: '' },
      { x: 216, y: 150, kind: 'belay' },
    ])
    expect(parsePoints(formatPoints(points))).toEqual(points)
  })
})

describe('guideFromXml', () => {
  it('reads Lowdina: header, climbs, topos and GPS, ignoring downloader junk', () => {
    const guide = guideFromXml('167', fixture('167'))
    const types = new Set(guide.nodes.map((n) => n.type))
    expect(types).toContain('header')
    expect(types).toContain('image')
    expect(types).toContain('gps')
    expect(JSON.stringify(guide)).not.toContain('parsererror')

    const header = guide.nodes.find((n) => n.type === 'header')
    expect(header).toMatchObject({ name: 'Lowdina', rock: 'Dolerite' })

    const topo = guide.nodes.find((n): n is ImageTopo => n.type === 'image')!
    expect(topo.src).toBe('Lowdina overview.jpg')
    expect(topo.paths.length).toBeGreaterThan(0)
    const kinds = guide.nodes.flatMap((n) => (n.type === 'image' ? n.paths.flatMap((p) => p.points.map((pt) => pt.kind)) : []))
    expect(kinds).toContain('belay')
    expect(topo.rects[0]).toMatchObject({ style: 'black_text_on_solid_yellow' })
  })

  it('reads boulder problems as climbs of type "problem"', () => {
    const guide = guideFromXml('200900619', fixture('200900619'))
    expect(guide.nodes.some((n) => n.type === 'problem')).toBe(true)
  })
})

describe('round trip', () => {
  it.each(['167', '200900619', '1966082'])('guide %s survives xml -> model -> xml -> model', (id) => {
    const model = guideFromXml(id, fixture(id))
    const xml = guideToXml(model)
    expect(guideFromXml(id, xml)).toEqual(model)
    // Formatting is idempotent, so repeated saves never create diff noise.
    expect(guideToXml(guideFromXml(id, xml))).toBe(xml)
    expect(xml.endsWith('\n')).toBe(true)
  })
})
