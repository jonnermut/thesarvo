import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '#/guide/save/history'
import { recentChanges, siteRecent } from './recent'
import type { IndexNode } from './types'

const entry = (session: string, end: string, name = 'Ann', description = 'edited a climb'): HistoryEntry => ({ session, user: { sub: name, name }, start: end, end, saves: 1, nodes: {}, description })
const node = (id: string, path = id): Pick<IndexNode, 'id' | 'path' | 'title'> => ({ id, path, title: `Page ${id}` })

describe('recentChanges', () => {
  it('lists each page’s latest change, newest first, and stops at the limit', () => {
    const pages = [
      { node: node('1'), history: [entry('a', '2026-01-01T00:00:00Z'), entry('b', '2026-03-01T00:00:00Z')] },
      { node: node('2'), history: [entry('c', '2026-02-01T00:00:00Z')] },
      { node: node('3'), history: [] },
    ]
    expect(recentChanges(pages).map((c) => [c.id, c.session])).toEqual([['1', 'b'], ['2', 'c']])
    expect(recentChanges(pages, 1)).toHaveLength(1)
  })
  it('carries the editor’s email key, which finds their picture', () => {
    const keyed: HistoryEntry = { ...entry('a', '2026-01-01T00:00:00Z'), user: { sub: 'u1', name: 'Ann', key: 'email:aa243d065e79166e' } }
    expect(recentChanges([{ node: node('1'), history: [keyed] }])).toMatchObject([{ sub: 'u1', key: 'email:aa243d065e79166e' }])
    expect(recentChanges([{ node: node('1'), history: [entry('b', '2026-01-01T00:00:00Z')] }])[0]).not.toHaveProperty('key')
  })
  it('skips sums of old edits and unreadable versions, and hides an unknown editor', () => {
    const pages = [
      { node: node('1'), history: [entry('a', '2020-01-01T00:00:00Z'), entry('b', '2021-01-01T00:00:00Z', 'Earlier editors'), entry('c', '2022-01-01T00:00:00Z', 'Bob', 'a version could not be read')] },
      { node: node('2'), history: [entry('d', '2019-01-01T00:00:00Z', 'Unknown')] },
    ]
    expect(recentChanges(pages)).toMatchObject([{ id: '1', session: 'a', name: 'Ann' }, { id: '2', session: 'd', name: '' }])
  })
  it('shows a batch run over many guides as one line counting them all, and each page still shows its latest edit by a person', () => {
    const bot = (end: string): HistoryEntry => ({ ...entry('qa-1', end, 'thesarvo bot', 'fixed up 3 climbs'), user: { sub: 'thesarvo-bot', name: 'thesarvo bot' }, batch: 'fixed up {n} guides' })
    const pages = [
      { node: node('1'), history: [entry('a', '2026-03-01T00:00:00Z'), bot('2026-05-01T00:00:01Z')] },
      { node: node('2'), history: [bot('2026-05-01T00:00:02Z')] },
      { node: node('3'), history: [bot('2026-05-01T00:00:00Z'), entry('b', '2026-06-01T00:00:00Z')] },
      { node: node('4'), history: [entry('c', '2026-04-01T00:00:00Z')] },
    ]
    expect(recentChanges(pages)).toMatchObject([
      { id: '3', session: 'b' },
      { id: 'batch:qa-1', path: '', title: '', name: 'thesarvo bot', description: 'fixed up 3 guides', guides: 3, at: '2026-05-01T00:00:02Z' },
      { id: '4', session: 'c' },
      { id: '1', session: 'a' },
    ])
  })
})

describe('siteRecent', () => {
  it('reads the history of the guides in the tree', async () => {
    const tree = { id: '0', title: 'Guides', path: '', isGuide: false, children: [{ id: '1', title: 'One', path: 'one', isGuide: true, children: [] }, { id: '2', title: 'Two', path: 'two', isGuide: false, children: [] }] } satisfies IndexNode
    const source = { getHistory: (id: string) => Promise.resolve([entry(`s${id}`, '2026-01-01T00:00:00Z')]) }
    expect((await siteRecent(source, tree)).map((c) => c.session)).toEqual(['s1'])
  })
})
