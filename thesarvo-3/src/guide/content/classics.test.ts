import { describe, expect, it } from 'vitest'
import type { Guide } from '#/guide/model/types'
import { siteClassics } from './classics'
import type { IndexNode } from './types'

const climb = (id: string, name: string, stars: string, extra = '') => ({ type: 'climb' as const, id, name, number: '1.', grade: '20', extra, length: '20m', stars, fa: '', text: '' })
const guide = (id: string, nodes: Guide['nodes']): Guide => ({ id, guideStars: '', nodes })

describe('siteClassics', () => {
  it('lists the three-star climbs of the guides in the tree, with the guide they are in', async () => {
    const tree = { id: '0', title: 'Guides', path: '', isGuide: false, children: [{ id: '1', title: 'One', path: 'south/one', isGuide: true, children: [] }, { id: '2', title: 'Two', path: 'two', isGuide: false, children: [] }] } satisfies IndexNode
    const guides = { '1': guide('1', [climb('a', 'Fine Line', '***', 'Þ'), climb('b', 'Meh', '**'), climb('c', 'Great Wall', '***')]) }
    const classics = await siteClassics({ getGuide: async (id) => guides[id as '1'] ?? null }, tree)
    expect(classics.map((c) => [c.name, c.guide, c.path, c.sport])).toEqual([['Fine Line', 'One', 'south/one', true], ['Great Wall', 'One', 'south/one', false]])
    expect(classics[0].anchor).toBeTruthy()
  })
})
