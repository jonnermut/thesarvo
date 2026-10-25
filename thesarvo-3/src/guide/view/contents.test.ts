import { describe, expect, it } from 'vitest'
import type { GuideNode } from '#/guide/model/types'
import { guideContents, matchesQuery, nodeAnchors } from './contents'

const text = (id: string, cls: string, t: string) => ({ type: 'text', id, cls, text: t }) as GuideNode
const climb = (id: string, name: string, grade = '', stars = '') =>
  ({ type: 'climb', id, name, grade, stars, number: '1', extra: '', length: '', fa: '', text: '' }) as GuideNode

const nodes: GuideNode[] = [
  { type: 'header', id: 'h', name: 'Crag' } as GuideNode,
  text('1', 'heading2', 'Main Wall<br/><br/>'),
  text('2', 'text', 'Some words'),
  climb('3', 'Carnap', '17', '**'),
  text('4', 'heading3', 'Left side'),
  climb('3', 'Copy', '22'),
  { type: 'gps', id: '9', points: [{ pid: '1' }], lines: [] } as unknown as GuideNode,
]

describe('nodeAnchors', () => {
  it('prefixes by type and keeps repeated ids distinct', () => {
    expect(nodeAnchors(nodes)).toEqual(['intro', 't-1', 't-2', 'c-3', 't-4', 'c-3-2', 'gps'])
  })
})

describe('guideContents', () => {
  it('lists the introduction, headings, climbs and GPS', () => {
    expect(guideContents(nodes).map((e) => [e.kind, e.level, e.text])).toEqual([
      ['intro', 0, 'Introduction'],
      ['heading', 0, 'Main Wall'],
      ['climb', 1, 'Carnap'],
      ['heading', 1, 'Left side'],
      ['climb', 1, 'Copy'],
      ['gps', 0, 'GPS'],
    ])
  })
})

describe('matchesQuery', () => {
  const [, , carnap] = guideContents(nodes)
  it('matches every word against name, grade and stars', () => {
    expect(matchesQuery(carnap, 'carn')).toBe(true)
    expect(matchesQuery(carnap, '** 17')).toBe(true)
    expect(matchesQuery(carnap, '*** 17')).toBe(false)
    expect(matchesQuery(carnap, 'carnap 22')).toBe(false)
  })
})
