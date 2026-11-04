import { expect, it } from 'vitest'
import { clusterName, clusterPins, dedupe, placeChain } from './cluster'
import type { Pin } from './cluster'

const pin = (id: string, lat: number, lng: number, ...area: string[]): Pin => ({ id, lat, lng, area })

it('rewrites a boulder crag to its region', () => {
  expect(placeChain(['Bouldering', 'Hobart', 'Wellington'])).toEqual(['Hobart bouldering', 'Wellington'])
  expect(placeChain(['South East', 'Hobart'])).toEqual(['South East', 'Hobart'])
})

it('keeps the deepest guide at one spot', () => {
  const out = dedupe([pin('a', -42.12341, 147.1, 'West'), pin('b', -42.12343, 147.1, 'West', 'Adamsfield'), pin('c', -42.5, 147.1, 'West')])
  expect(out.map((p) => p.id).sort()).toEqual(['b', 'c'])
})

it('names a cluster of few places for the biggest and the others, ties alphabetical', () => {
  expect(clusterName([pin('a', 0, 0, 'West', 'Gordon Gorge'), pin('b', 0, 0, 'West', 'Gordon Gorge'), pin('c', 0, 0, 'West', 'Adamsfield'), pin('d', 0, 0, 'West', 'Zeehan')])).toBe('Gordon Gorge +2')
  expect(clusterName([pin('a', 0, 0, 'West', 'Zeehan'), pin('b', 0, 0, 'West', 'Adamsfield')])).toBe('Adamsfield +1')
  expect(clusterName([pin('a', 0, 0, 'West', 'Zeehan')])).toBe('Zeehan')
})

it('names a cluster of many places for the deepest area they share, else the commonest top level', () => {
  const many = ['a', 'b', 'c', 'd', 'e'].map((n) => pin(n, 0, 0, 'South East', 'Kunanyi', n))
  expect(clusterName(many)).toBe('Kunanyi')
  const mixed = [...many.slice(0, 3), pin('x', 0, 0, 'West', 'x'), pin('y', 0, 0, 'East', 'y')]
  expect(clusterName(mixed)).toBe('South East')
})

it('groups pins by screen cell', () => {
  const pins = [pin('a', 0, 0, 'N', 'A'), pin('b', 0, 0, 'N', 'B'), pin('c', 1, 1, 'S', 'C')]
  const clusters = clusterPins(pins, (p) => ({ x: p.lat * 100, y: p.lng * 100 }), 50)
  expect(clusters.map((c) => c.pins.length).sort()).toEqual([1, 2])
  expect(clusters.find((c) => c.pins.length === 1)?.name).toBe('C')
})
