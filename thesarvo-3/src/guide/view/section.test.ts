import { describe, expect, it } from 'vitest'
import type { Climb, GuideNode, ImageTopo, TextBlock } from '#/guide/model/types'
import { legendRedundant, topoSection } from './section'

const climb = (id: string): Climb => ({ type: 'problem', id, name: id, number: '', grade: '', extra: '', length: '', stars: '', fa: '', text: '' })
const text = (id: string, cls = 'text'): TextBlock => ({ type: 'text', id, cls, text: id })
const topo = (id: string, legend: string[], other?: Record<string, string>): ImageTopo => ({
  type: 'image', id, src: '', width: 400, height: 500, noPrint: false, printLayout: '', legendTitle: '', legendFooter: '', legendX: 0, legendY: 0, legend, paths: [], rects: [], otherShapes: [], other,
})

describe('topoSection', () => {
  // Shaped like Roches Beach: photos each followed by their problems, a note, then a new heading.
  const nodes: GuideNode[] = [text('Main', 'heading2'), topo('t1', ['a']), text('note'), climb('a'), climb('b'), text('aside'), topo('t2', []), text('Block', 'heading2'), climb('c')]
  it('runs to the next topo or heading and adds after its last climb', () => {
    expect(topoSection(nodes, 1)).toEqual({ climbs: [climb('a'), climb('b')], insertAt: 5 })
  })
  it('adds straight after a topo with no climbs yet, before the next heading', () => {
    expect(topoSection(nodes, 6)).toEqual({ climbs: [], insertAt: 7 })
  })
})

describe('legendRedundant', () => {
  const below = [climb('a'), climb('b'), climb('c')]
  it('hides a legend when its climbs follow the photo, whether or not the old site drew it', () => {
    expect(legendRedundant(topo('t', ['b', 'a']), below)).toBe(true)
    expect(legendRedundant(topo('t', ['a', 'b'], { legend: 'true' }), below)).toBe(true)
  })
  it('keeps a legend with a title or footer', () => {
    expect(legendRedundant({ ...topo('t', ['a', 'b']), legendTitle: 'Left wall' }, below)).toBe(false)
  })
  it('keeps a legend naming climbs listed elsewhere', () => {
    expect(legendRedundant(topo('t', ['a', 'z']), below)).toBe(false)
    expect(legendRedundant(topo('t', ['a', 'c']), below)).toBe(false)
  })
})
