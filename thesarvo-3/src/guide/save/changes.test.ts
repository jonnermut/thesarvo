import { describe, expect, it } from 'vitest'
import type { Climb, Guide, GuideNode, Header, TextBlock } from '#/guide/model/types'
import { newTopo } from '#/guide/edit/newNodes'
import { canonical, diffGuides, ensureIds, isEmpty, mergeChanges, mergeOrder, renameChanges } from './changes'

const text = (id: string, t = ''): TextBlock => ({ type: 'text', id, cls: 'text', text: t })
const climb = (id: string, name = '', number = ''): Climb => ({
  type: 'climb', id, name, number, grade: '', extra: '', length: '', stars: '', fa: '', text: '',
})
const guide = (...nodes: GuideNode[]): Guide => ({ id: '1', guideStars: '', nodes })
const ids = (g: Guide) => g.nodes.map((n) => (n.type === 'unknown' ? '?' : n.id))
const edit = (g: Guide, id: string, t: string): Guide => ({ ...g, nodes: g.nodes.map((n) => (n.type === 'text' && n.id === id ? { ...n, text: t } : n)) })

describe('canonical', () => {
  it('ignores key order and undefined', () => {
    expect(canonical({ b: 1, a: { d: 2, c: undefined } })).toBe(canonical({ a: { d: 2 }, b: 1 }))
  })
})

describe('ensureIds', () => {
  it('numbers blank and repeated ids after the highest, leaving a guide that is fine alone', () => {
    const g = guide(text('5'), text(''), text('5'), { type: 'unknown', raw: { tag: 'x', attrs: {}, children: [], text: '' } })
    expect(ids(ensureIds(g))).toEqual(['5', '6', '7', '?'])
    const fine = guide(text('1'), text('2'))
    expect(ensureIds(fine)).toBe(fine)
  })
})

describe('diffGuides', () => {
  it('lists added, edited and deleted nodes, and the order when it changed', () => {
    const base = guide(text('1', 'a'), text('2'), text('3'))
    const next = guide(text('3'), text('1', 'b'), text('4'))
    const c = diffGuides(base, next)
    expect(c.nodes.map((n) => [n.id, !!n.before, !!n.after])).toEqual([['1', true, true], ['2', true, false], ['4', false, true]])
    expect(c.order).toEqual({ before: ['1', '2', '3'], after: ['3', '1', '4'] })
    expect(isEmpty(diffGuides(base, base))).toBe(true)
  })

  it('leaves the order out when only content changed', () => {
    expect(diffGuides(guide(text('1', 'a')), guide(text('1', 'b'))).order).toBeUndefined()
  })
})

describe('mergeOrder', () => {
  const all = (...keys: string[]) => new Set(keys)
  it('keeps the current order and slots this save’s new node in after its neighbour', () => {
    expect(mergeOrder(['1', 'x', '2', '3'], ['1', '2', '3'], ['1', '2', 'n', '3'], all('1', 'x', '2', 'n', '3'))).toEqual(['1', 'x', '2', 'n', '3'])
  })
  it('uses this save’s order when it moved nodes, slotting in nodes added since', () => {
    expect(mergeOrder(['1', '2', 'x', '3'], ['1', '2', '3'], ['3', '1', '2'], all('1', '2', 'x', '3'))).toEqual(['3', '1', '2', 'x'])
  })
  it('puts a new node with no neighbour first', () => {
    expect(mergeOrder(['1'], ['1'], ['n', '1'], all('n', '1'))).toEqual(['n', '1'])
  })
})

describe('mergeChanges', () => {
  it('applies a save to the guide it was made on', () => {
    const base = guide(text('1', 'a'), text('2'))
    const mine = guide(text('1', 'b'), text('3'))
    const { guide: merged, conflicts } = mergeChanges(base, diffGuides(base, mine))
    expect(merged).toEqual(mine)
    expect(conflicts).toEqual([])
  })

  it('merges edits to different nodes', () => {
    const base = guide(text('1', 'a'), text('2', 'a'))
    const theirs = edit(base, '2', 'theirs')
    const { guide: merged, conflicts } = mergeChanges(theirs, diffGuides(base, edit(base, '1', 'mine')))
    expect(merged).toEqual(guide(text('1', 'mine'), text('2', 'theirs')))
    expect(conflicts).toEqual([])
  })

  it('reports two edits to one node, leaving theirs, unless mine wins', () => {
    const base = guide(text('1', 'a'), text('2'))
    const theirs = edit(base, '1', 'theirs')
    const changes = diffGuides(base, edit(edit(base, '1', 'mine'), '2', 'also'))
    const { guide: merged, conflicts } = mergeChanges(theirs, changes)
    expect(conflicts).toEqual([{ id: '1', theirs: text('1', 'theirs'), mine: text('1', 'mine') }])
    expect(merged).toEqual(guide(text('1', 'theirs'), text('2', 'also')))
    expect(mergeChanges(theirs, changes, true).guide).toEqual(guide(text('1', 'mine'), text('2', 'also')))
  })

  it('treats the same edit made twice as no conflict', () => {
    const base = guide(text('1', 'a'))
    const both = edit(base, '1', 'b')
    expect(mergeChanges(both, diffGuides(base, both)).conflicts).toEqual([])
  })

  it('reports an edit to a node someone deleted', () => {
    const base = guide(text('1', 'a'), text('2'))
    const { conflicts, guide: merged } = mergeChanges(guide(text('2')), diffGuides(base, edit(base, '1', 'b')))
    expect(conflicts).toEqual([{ id: '1', theirs: null, mine: text('1', 'b') }])
    expect(ids(merged)).toEqual(['2'])
  })

  it('keeps both of two nodes added with one id, renaming mine and the topo that lists it', () => {
    const base = guide(text('1'))
    const theirs = guide(text('1'), text('2', 'theirs'))
    const topo = { ...newTopo('3', 'a.jpg', 10, 10), legend: ['2'] }
    const mine = guide(text('1'), climb('2', 'Mine'), topo)
    const { guide: merged, rename } = mergeChanges(theirs, diffGuides(base, mine))
    expect(rename).toEqual({ '2': '4' })
    expect(merged.nodes).toEqual([text('1'), text('2', 'theirs'), climb('4', 'Mine'), { ...topo, legend: ['4'] }])
  })

  it('applies guide stars unless someone changed them first', () => {
    const base = guide(text('1'))
    const changes = diffGuides(base, { ...base, guideStars: '**' })
    expect(mergeChanges(base, changes).guide.guideStars).toBe('**')
    expect(mergeChanges({ ...base, guideStars: '*' }, changes).guide.guideStars).toBe('*')
  })

  it('renumbers climbs when the header asks for it', () => {
    const header: Header = { type: 'header', id: 'h', name: '', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: 'true' }
    const base = guide(header, climb('1', 'A', '1.'))
    const mine = guide(header, climb('2', 'B'), climb('1', 'A', '1.'))
    expect(mergeChanges(base, diffGuides(base, mine)).guide.nodes.map((n) => (n.type === 'climb' ? n.number : ''))).toEqual(['', '1.', '2.'])
  })
})

describe('renameChanges', () => {
  it('renames ids, their nodes and topo references', () => {
    const topo = { ...newTopo('3', 'a.jpg', 10, 10), legend: ['2'] }
    const c = diffGuides(guide(), guide(climb('2'), topo))
    const renamed = renameChanges(c, { '2': '9' })
    expect(renamed.nodes.map((n) => n.id)).toEqual(['2', '3'].map((id) => (id === '2' ? '9' : id)))
    expect(renamed.nodes[0].after).toEqual(climb('9'))
    expect(renamed.nodes[1].after).toEqual({ ...topo, legend: ['9'] })
    expect(renamed.order?.after).toEqual(['9', '3'])
  })
})
