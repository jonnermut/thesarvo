import { describe, expect, it } from 'vitest'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { addPage, FIRST_LOCAL_ID, newGuide, nextPageId, parseAddPage, withChild } from './addPage'
import type { PageRepo } from './repo'

const node = (id: string, children: StoredIndexNode[] = []): StoredIndexNode => ({ id, title: `T${id}`, children })
const jon = { sub: 's1', email: 'jon@example.com', name: 'Jon', groups: [] }

class MemoryRepo implements PageRepo {
  commits: Parameters<PageRepo['commitPage']>[0][] = []
  constructor(public index: StoredIndexNode, public staleOnce = false) {}
  readIndex = () => Promise.resolve({ head: `c${this.commits.length}`, index: this.index })
  commitPage = (c: Parameters<PageRepo['commitPage']>[0]) => {
    if (this.staleOnce) {
      this.staleOnce = false
      this.index = withChild(this.index, '1', node('9000000009')) ?? this.index
      return Promise.resolve(null)
    }
    this.commits.push(c)
    this.index = c.index
    return Promise.resolve(`c${this.commits.length}`)
  }
}

describe('parseAddPage', () => {
  it('tidies the title and checks the rest', () => {
    expect(parseAddPage({ parent: '5', title: '  Fresh   Crag ', kind: 'guide' })).toEqual({ parent: '5', title: 'Fresh Crag', kind: 'guide' })
    for (const bad of [null, {}, { parent: '5', title: '', kind: 'guide' }, { parent: '5', title: 'x'.repeat(81), kind: 'guide' }, { parent: 'a', title: 'x', kind: 'guide' }, { parent: '5', title: '<b>', kind: 'guide' }, { parent: '5', title: 'x', kind: 'html' }])
      expect(() => parseAddPage(bad)).toThrow()
  })
})

describe('the new page', () => {
  it('gets the next local id, starting above the test guide', () => {
    expect(nextPageId(node('1', [node('84')]))).toBe(String(FIRST_LOCAL_ID))
    expect(nextPageId(node('1', [node('84', [node('9000000004')]), node('9000000001')]))).toBe('9000000005')
  })
  it('goes last under its parent, wherever that is, or nowhere when there is no parent', () => {
    const tree = node('1', [node('2', [node('3')]), node('4')])
    expect(withChild(tree, '3', node('9'))?.children[0].children[0].children.map((n) => n.id)).toEqual(['9'])
    expect(withChild(tree, '1', node('9'))?.children.map((n) => n.id)).toEqual(['2', '4', '9'])
    expect(withChild(tree, '77', node('9'))).toBeNull()
  })
  it('starts as a guide with a header named for it', () => {
    expect(newGuide('9000000002', 'Fresh Crag')).toMatchObject({ id: '9000000002', nodes: [{ type: 'header', name: 'Fresh Crag' }] })
  })
})

describe('addPage', () => {
  const request = { parent: '1', title: 'Fresh Crag', kind: 'guide' as const }
  it('commits the tree, the guide and a created entry together', async () => {
    const repo = new MemoryRepo(node('1', [node('2')]))
    const result = await addPage(repo, jon, request, () => new Date('2026-10-29T01:00:00Z'))
    expect(result).toEqual({ status: 'added', id: String(FIRST_LOCAL_ID) })
    const [c] = repo.commits
    expect(c.index.children.map((n) => [n.id, n.title])).toEqual([['2', 'T2'], [String(FIRST_LOCAL_ID), 'Fresh Crag']])
    expect(c.guide.nodes[0]).toMatchObject({ type: 'header', name: 'Fresh Crag' })
    expect(c.history).toHaveLength(1)
    expect(c.history[0]).toMatchObject({ description: 'created the page', user: { sub: 's1', name: 'Jon' }, start: '2026-10-29T01:00:00.000Z' })
    expect(c.message.headline).toBe('Fresh Crag: Jon created the page')
  })
  it('tries again on the newer tree when someone saved in between, taking the next id', async () => {
    const repo = new MemoryRepo(node('1'), true)
    expect(await addPage(repo, jon, request)).toEqual({ status: 'added', id: '9000000010' })
    expect(repo.index.children.map((n) => n.id)).toEqual(['9000000009', '9000000010'])
  })
  it('says so when the parent is not there, committing nothing', async () => {
    const repo = new MemoryRepo(node('1'))
    expect(await addPage(repo, jon, { ...request, parent: '99' })).toEqual({ status: 'missing' })
    expect(repo.commits).toHaveLength(0)
  })
})
