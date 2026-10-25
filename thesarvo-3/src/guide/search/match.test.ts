import { describe, expect, it } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import type { GuideNode } from '#/guide/model/types'
import { buildSearchIndex, normalise, parseQuery, search, similarity, suggest } from './match'
import { guideShard, mergeShards } from './shard'
import type { Shard } from './shard'

const node = (id: string, title: string, children: IndexNode[] = [], isGuide = true): IndexNode => ({ id, title, path: id, isGuide, children })
const root = node('0', 'Climbing Guides', [
  node('1', 'South East', [node('2', 'Lowdina'), node('3', 'Kunanyi - Mt Wellington'), node('4', 'Arete Rocks')], false),
  node('5', 'Bouldering', [node('6', 'Hobart')], false),
])
const shards: Shard[] = [
  {
    g: '2',
    e: [
      ['h', 't-1', 'Main Wall'],
      ['c', 'c-2', 'Arete', '17', 2, 0],
      ['c', 'c-3', 'Bolted Arete', '22', 3, 1],
      ['c', 'c-4', 'Catch 22', '18', 0, 0],
    ],
  },
  { g: '3', e: [['c', 'c-1', 'Sky Arete', '22', 1, 0], ['h', 't-2', 'Organ Pipes']] },
  { g: '6', e: [['p', 'c-1', 'Crimpy Aréte', 'V3', 2, 0]] },
]
const index = buildSearchIndex(root, shards)
const flat = (q: string, guideId?: string) =>
  search(index, q, guideId).groups.flatMap((g) => [...(g.page ? [`[${g.page.text}]`] : []), ...g.hits.map((h) => `${g.node.title}: ${h.text}`)])

describe('normalise', () => {
  it('ignores case, accents and punctuation, and treats Mount as Mt', () => {
    expect(normalise("Dave's Crimpy Aréte - Mount Wellington")).toBe('daves crimpy arete mt wellington')
  })
})

describe('parseQuery', () => {
  it('pulls out grades, stars and types', () => {
    expect(parseQuery('** 20-23 sport arete 22 v3')).toEqual({ words: ['arete'], text: 'arete', stars: 2, grade: [20, 23], type: 'sport', numbers: ['22', '3'] })
  })
})

describe('search', () => {
  it('ranks exact names, then starts, then word starts, more stars first; grouped by guide', () => {
    expect(flat('arete')).toEqual(['Lowdina: Arete', 'Lowdina: Bolted Arete', '[Arete Rocks]', 'Hobart: Crimpy Aréte', 'Kunanyi - Mt Wellington: Sky Arete'])
  })

  it('lets words match the guide and regions above, if one matches the entry', () => {
    expect(flat('lowdina arete')).toEqual(['Lowdina: Bolted Arete', 'Lowdina: Arete'])
    expect(flat('lowdina')).toEqual(['[Lowdina]'])
    expect(flat('mount wellington')).toEqual(['[Kunanyi - Mt Wellington]'])
    expect(flat('kunanyi')).toEqual(['[Kunanyi - Mt Wellington]'])
  })

  it('filters by stars, grade, range and type, within a guide or region', () => {
    expect(flat('***')).toEqual(['Lowdina: Bolted Arete'])
    expect(flat('22')).toEqual(['Lowdina: Bolted Arete', 'Lowdina: Catch 22', 'Kunanyi - Mt Wellington: Sky Arete'])
    expect(flat('17-18 lowdina')).toEqual(['Lowdina: Arete', 'Lowdina: Catch 22'])
    expect(flat('sport')).toEqual(['Lowdina: Bolted Arete'])
    // 22 is a grade, or part of a name.
    expect(flat('trad south east 22')).toEqual(['Kunanyi - Mt Wellington: Sky Arete', 'Lowdina: Catch 22'])
    expect(flat('boulder v3')).toEqual(['Hobart: Crimpy Aréte'])
  })

  it('searches one guide only when asked', () => {
    expect(flat('arete', '3')).toEqual(['Kunanyi - Mt Wellington: Sky Arete'])
  })

  it('finds nothing for an empty query', () => {
    expect(search(index, '  ').total).toBe(0)
  })
})

describe('suggest', () => {
  it('scores letter pairs in common', () => {
    expect(similarity('arete', 'arete')).toBe(1)
    expect(similarity('lowdena', 'lowdina')).toBeCloseTo(0.67, 2)
    expect(similarity('abc', 'xyz')).toBe(0)
  })

  it('swaps misspelt words for the closest that finds something, keeping the rest', () => {
    expect(suggest(index, 'lowdena')).toBe('lowdina')
    expect(suggest(index, 'arette ** lowdina')).toBe('arete ** lowdina')
    expect(suggest(index, 'organ pipez')).toBe('organ pipes')
  })

  it('offers nothing when no word is close or the fix still finds nothing', () => {
    expect(suggest(index, 'zzyzx')).toBeUndefined()
    expect(suggest(index, 'arete')).toBeUndefined()
    expect(suggest(index, 'organ pipez', '2')).toBeUndefined()
  })
})

describe('guideShard', () => {
  it('lists headings, GPS, climbs and problems with grade, stars and sport', () => {
    const nodes = [
      { type: 'header', id: 'h', name: 'Crag' },
      { type: 'text', id: '1', cls: 'heading2', text: 'Main Wall' },
      { type: 'climb', id: '2', name: 'Carnap', grade: ' 17 ', stars: '**', extra: '', number: '', length: '', fa: '', text: '' },
      { type: 'climb', id: '3', name: 'Bolts', grade: '22', stars: '', extra: '6B', number: '', length: '', fa: '', text: '' },
      { type: 'problem', id: '4', name: 'Crimp', grade: 'V3', stars: '***', extra: '', number: '', length: '', fa: '', text: '' },
      { type: 'gps', id: '9', points: [{ pid: '1' }], lines: [] },
    ] as unknown as GuideNode[]
    expect(guideShard({ id: '7', guideStars: '', nodes })).toEqual({
      g: '7',
      e: [
        ['h', 't-1', 'Main Wall'],
        ['c', 'c-2', 'Carnap', '17', 2, 0],
        ['c', 'c-3', 'Bolts', '22', 0, 1],
        ['p', 'c-4', 'Crimp', 'V3', 3, 0],
        ['h', 'gps', 'GPS'],
      ],
    })
  })
})

describe('mergeShards', () => {
  it('replaces changed guides and drops deleted ones', () => {
    const pack: Shard[] = [{ g: '1', e: [] }, { g: '2', e: [] }, { g: '3', e: [] }]
    expect(mergeShards(pack, [{ g: '2', e: [['h', 'x', 'New']] }], ['3'])).toEqual([{ g: '1', e: [] }, { g: '2', e: [['h', 'x', 'New']] }])
  })
})
