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
  it('skips sums of old edits and unreadable versions, and hides an unknown editor', () => {
    const pages = [
      { node: node('1'), history: [entry('a', '2020-01-01T00:00:00Z'), entry('b', '2021-01-01T00:00:00Z', 'Earlier editors'), entry('c', '2022-01-01T00:00:00Z', 'Bob', 'a version could not be read')] },
      { node: node('2'), history: [entry('d', '2019-01-01T00:00:00Z', 'Unknown')] },
    ]
    expect(recentChanges(pages)).toMatchObject([{ id: '1', session: 'a', name: 'Ann' }, { id: '2', session: 'd', name: '' }])
  })
})

describe('siteRecent', () => {
  it('reads the history of the guides in the tree', async () => {
    const tree = { id: '0', title: 'Guides', path: '', isGuide: false, children: [{ id: '1', title: 'One', path: 'one', isGuide: true, children: [] }, { id: '2', title: 'Two', path: 'two', isGuide: false, children: [] }] } satisfies IndexNode
    const source = { getHistory: (id: string) => Promise.resolve([entry(`s${id}`, '2026-01-01T00:00:00Z')]) }
    expect((await siteRecent(source, tree)).map((c) => c.session)).toEqual(['s1'])
  })
})
