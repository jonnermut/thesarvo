import { describe, expect, it } from 'vitest'
import type { Climb, Guide } from '#/guide/model/types'
import { DiskContentSource } from './disk'
import { buildManifest, guideStats, manifestTree, pageInfo } from './manifest'
import { flatten } from './paths'

const source = new DiskContentSource('fixtures')
const climb = (grade: string, stars = '', extra = ''): Climb =>
  ({ type: 'climb', id: grade, name: 'x', grade, stars, extra, number: '', length: '', fa: '', text: '' })

describe('guideStats', () => {
  it('counts climbs, bands, sport and stars', () => {
    const guide = { id: '1', nodes: [climb('15', '*'), climb('22', '***', '6B'), climb('22', '**'), climb('?')] } as Guide
    expect(guideStats(guide)).toEqual({ total: 4, problems: false, bands: [1, 0, 2, 0], sport: 1, stars: [1, 1, 1], topos: 0, gps: false })
  })
})

describe('manifest', async () => {
  const root = await source.getIndex()
  const manifest = await buildManifest(root, (id) => source.getGuide(id))

  it('round-trips the tree, adding counts that include descendants', () => {
    const tree = manifestTree(manifest)
    expect(flatten(tree).map((n) => n.path)).toEqual(flatten(root).map((n) => n.path))
    const lowdina = tree.children[0].children[0]
    expect(lowdina.stats?.total).toBeGreaterThan(0)
    expect(tree.children[0].count).toBe(lowdina.count! + (tree.children[0].children[1].count ?? 0))
    expect(tree.count).toBe(flatten(tree).reduce((sum, n) => sum + (n.stats?.total ?? 0), 0))
  })

  it('gives a page its trail and a tree trimmed to its surroundings', () => {
    const info = pageInfo(manifestTree(manifest), 'south-east/lowdina')!
    expect(info.node.title).toBe('Lowdina')
    expect(info.trail.map((n) => n.path)).toEqual(['', 'south-east'])
    expect(info.tree.children.map((n) => n.path)).toEqual(['south-east', 'bouldering-and-more', 'some-crag'])
    expect(info.tree.children[0].children.map((n) => n.path)).toEqual(['south-east/lowdina', 'south-east/lowdina-2'])
    expect(pageInfo(root, 'nowhere')).toBeNull()
  })

  it('marks branches it leaves out', () => {
    const info = pageInfo(manifestTree(manifest), 'some-crag')!
    expect(info.tree.children[0]).toMatchObject({ path: 'south-east', children: [], more: true })
  })
})
