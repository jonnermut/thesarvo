import { describe, expect, it } from 'vitest'
import type { Classic, GuideStats } from '#/guide/content/manifest'
import type { IndexNode } from '#/guide/content/types'
import { rollup } from './rollup'

const stats = (total: number, classics: Classic[], extra: Partial<GuideStats> = {}): GuideStats => ({
  total, problems: false, bands: [1, 2, 3, 4], sport: 1, stars: [1, 1, 1], topos: 2, gps: false, classics, ...extra,
})
const node = (id: string, s?: GuideStats, children: IndexNode[] = []): IndexNode => ({ id, title: id, path: id, isGuide: !!s, children, stats: s })

describe('rollup', () => {
  it('adds up the guides below, taking classics from each in turn', () => {
    const region = node('region', undefined, [
      node('a', stats(10, [['c-1', 'A1', '20', 3], ['c-2', 'A2', '22', 3]], { gps: true })),
      node('area', undefined, [node('b', stats(5, [['c-3', 'B1', '18', 2]]))]),
      node('c', stats(4, [['c-4', 'C1', '24', 3]])),
    ])
    const r = rollup(region)!
    expect(r).toMatchObject({ total: 19, bands: [3, 6, 9, 12], sport: 3, stars: [3, 3, 3], topos: 6, guides: 3, withGps: 1 })
    expect(r.classics.map(([g, c]) => `${g.id}:${c[1]}`)).toEqual(['a:A1', 'c:C1', 'b:B1'])
  })

  it('counts only the kind most guides are, and nothing for an empty region', () => {
    const mixed = node('m', undefined, [node('a', stats(10, [])), node('b', stats(3, [], { problems: true, bands: [3] })), node('c', stats(2, []))])
    expect(rollup(mixed)).toMatchObject({ total: 12, problems: false, guides: 2 })
    expect(rollup(node('empty', undefined, [node('info')]))).toBeUndefined()
  })
})
