import { describe, expect, it } from 'vitest'
import type { Climb, Guide, GuideNode, Header, TextBlock } from '#/guide/model/types'
import { newTopo } from '#/guide/edit/newNodes'
import { diffGuides } from './changes'
import { describe as describeChanges, movedIds, updateHistory } from './history'
import type { HistoryEntry } from './history'

const text = (id: string, t = '', cls = 'text'): TextBlock => ({ type: 'text', id, cls, text: t })
const climb = (id: string, name = '', more: Partial<Climb> = {}): Climb => ({
  type: 'climb', id, name, number: '', grade: '', extra: '', length: '', stars: '', fa: '', text: '', ...more,
})
const header: Header = { type: 'header', id: 'h', name: 'Crag', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }
const guide = (...nodes: GuideNode[]): Guide => ({ id: '1', guideStars: '', nodes })
const jon = { sub: 's1', name: 'Jon' }

/** The description of going from `a` to `b`. */
const said = (a: Guide, b: Guide) => {
  const c = diffGuides(a, b)
  return describeChanges(Object.fromEntries(c.nodes.map((n) => [n.id, n])), c.order, c.guideStars, new Map(b.nodes.flatMap((n) => (n.type === 'unknown' ? [] : [[n.id, n]]))))
}

describe('describe', () => {
  const base = guide(header, climb('1', 'Albatros', { grade: '20' }), climb('2', 'Bat'), text('3', 'Hi'))
  const topo = { ...newTopo('9', 'a.jpg', 1, 1), paths: [{ id: '10', points: [], d: '', linkedTo: '5', lineStyle: 'solid' as const, labelText: '', arrow: false }] }
  it('names one or two things', () => {
    expect(said(base, guide(header, climb('1', 'Albatros', { grade: '20', text: 'Steep' }), climb('2', 'Bat'), text('3', 'Hi')))).toBe('edited the climb Albatros')
    expect(said(base, guide(...base.nodes, climb('4', 'Cat'), topo))).toBe('added the climb Cat and a topo')
  })
  it('counts more', () => {
    expect(said(base, guide(...base.nodes, climb('4'), climb('5'), climb('6'), climb('7'), topo))).toBe('added 4 climbs and a topo')
  })
  it('tells a grade or stars change', () => {
    expect(said(base, guide(header, climb('1', 'Albatros', { grade: '21' }), climb('2', 'Bat'), text('3', 'Hi')))).toBe('changed the grade of Albatros from 20 to 21')
    expect(said(base, guide(header, climb('1', 'Albatros', { grade: '20' }), climb('2', 'Bat', { stars: '**' }), text('3', 'Hi')))).toBe('changed the stars of Bat from none to **')
  })
  it('names header fields', () => {
    expect(said(base, guide({ ...header, intro: 'x', access: 'y' }, ...base.nodes.slice(1)))).toBe('edited the intro and the access notes')
    expect(said(base, guide({ ...header, intro: 'x', access: 'y', walk: 'z' }, ...base.nodes.slice(1)))).toBe('edited the header')
  })
  it('joins added, edited, deleted and moved', () => {
    const next = guide(header, text('3', 'Hello'), climb('1', 'Albatros', { grade: '20' }), text('4', 'Crag', 'heading2'))
    expect(said(base, next)).toBe('added the heading Crag, edited a text block, deleted the climb Bat and moved the climb Albatros')
  })
  it('does not count climbs renumbered by autonumbering', () => {
    const numbered = guide(header, climb('1', 'Albatros', { grade: '20', number: '2.' }), climb('2', 'Bat', { number: '3.' }), text('3', 'Hi'))
    expect(said(base, guide(header, climb('0', 'New'), ...numbered.nodes.slice(1)))).toBe('added the climb New')
  })
})

describe('movedIds', () => {
  it('finds the fewest nodes that moved', () => {
    expect(movedIds(['1', '2', '3', '4'], ['2', '3', '4', '1'])).toEqual(['1'])
    expect(movedIds(['1', '2', '3'], ['1', 'n', '3'])).toEqual([])
  })
})

describe('updateHistory', () => {
  const base = guide(header, climb('1', 'Albatros'))
  const save = (g0: Guide, g1: Guide, session = 'a', user = jon, at = '2026-10-27T01:00:00Z') => ({ session, user, at, changes: diffGuides(g0, g1), guide: g1 })

  it('folds a session’s saves into one entry, net', () => {
    const g1 = guide(header, climb('1', 'Albatros', { text: 'x' }))
    const g2 = guide(header, climb('1', 'Albatros', { text: 'x' }), climb('2', 'Bat'))
    let h: HistoryEntry[] = updateHistory([], save(base, g1))
    h = updateHistory(h, save(g1, g2, 'a', jon, '2026-10-27T01:05:00Z'))
    expect(h).toHaveLength(1)
    expect(h[0]).toMatchObject({ saves: 2, start: '2026-10-27T01:00:00Z', end: '2026-10-27T01:05:00Z', description: 'added the climb Bat and edited the climb Albatros' })
    expect(h[0].nodes['1'].before).toEqual(climb('1', 'Albatros'))
  })

  it('leaves out climbs only renumbered by autonumbering', () => {
    const auto = { ...header, autonumber: 'true' }
    const g0 = guide(auto, climb('1', 'A', { number: '1.' }))
    const g1 = guide(auto, climb('2', 'B', { number: '1.' }), climb('1', 'A', { number: '2.' }))
    expect(Object.keys(updateHistory([], save(g0, g1))[0].nodes)).toEqual(['2'])
  })

  it('drops a session that undid itself', () => {
    const g1 = guide(header, climb('1', 'Albatros', { text: 'x' }))
    expect(updateHistory(updateHistory([], save(base, g1)), save(g1, base))).toEqual([])
  })

  it('starts a new entry for another session or another person', () => {
    const g1 = guide(header, climb('1', 'Albatros', { text: 'x' }))
    const g2 = guide(header, climb('1', 'Albatros', { text: 'y' }))
    const h = updateHistory(updateHistory([], save(base, g1)), save(g1, g2, 'a', { sub: 's2', name: 'Kim' }))
    expect(h.map((e) => e.user.name)).toEqual(['Jon', 'Kim'])
  })
})
