import { describe, expect, it } from 'vitest'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { changeTree, parseTreeChange } from './moveTree'
import { pathsOf, sameIds, withMoved, withMovedPage, withTitle } from './treeOps'
import type { Moved } from './treeOps'
import type { PageRepo } from './repo'

const node = (id: string, children: StoredIndexNode[] = [], title = `T${id}`): StoredIndexNode => ({ id, title, children })
const admin = { sub: 's1', email: 'jon@example.com', name: 'Jon', groups: ['admins'] }
const tree = () => node('1', [node('2', [node('3'), node('5')]), node('4')], 'Home')
const ids = (n: StoredIndexNode): string[] => [n.id, ...n.children.flatMap(ids)]

class MemoryRepo implements PageRepo {
  commits: Parameters<PageRepo['commitIndex']>[0][] = []
  moved: Moved = {}
  constructor(public index: StoredIndexNode, public staleOnce = false) {}
  readIndex = () => Promise.resolve({ head: `c${this.commits.length}`, index: this.index, moved: this.moved })
  commitPage = () => Promise.resolve(null)
  commitIndex = (c: Parameters<PageRepo['commitIndex']>[0]) => {
    if (this.staleOnce) {
      this.staleOnce = false
      return Promise.resolve(null)
    }
    this.commits.push(c)
    this.index = c.index
    if (c.moved) this.moved = c.moved
    return Promise.resolve(`c${this.commits.length}`)
  }
}

describe('parseTreeChange', () => {
  it('reads the three actions', () => {
    expect(parseTreeChange({ action: 'rename', page: '2', title: '  New   name ' })).toEqual({ action: 'rename', page: '2', title: 'New name' })
    expect(parseTreeChange({ action: 'move', page: '2', parent: '4', position: 0 })).toEqual({ action: 'move', page: '2', parent: '4', position: 0 })
    expect(parseTreeChange({ action: 'restore', index: tree() }).action).toBe('restore')
  })
  it('refuses bad input', () => {
    for (const bad of [null, {}, { action: 'x' }, { action: 'rename', page: '2', title: '' }, { action: 'rename', page: '2', title: '<b>' }, { action: 'rename', page: 'a', title: 'x' },
      { action: 'move', page: '2', parent: '4', position: -1 }, { action: 'move', page: '2', parent: '4', position: 1.5 }, { action: 'restore', index: { id: '1' } }])
      expect(() => parseTreeChange(bad)).toThrow()
  })
})

describe('pathsOf', () => {
  it('makes addresses from titles as the site does, with the id added to a repeated name', () => {
    const t = node('1', [node('2', [node('3', [], 'Mt Wellington')], 'Hobart & Around'), node('4', [], 'Hobart and around')], 'Home')
    expect([...pathsOf(t)]).toEqual([['1', ''], ['2', 'hobart-and-around'], ['3', 'hobart-and-around/mt-wellington'], ['4', 'hobart-and-around-4']])
  })
})

describe('withTitle and withMovedPage', () => {
  it('renames', () => {
    expect(withTitle(tree(), '3', 'Three')!.children[0].children[0].title).toBe('Three')
    expect(withTitle(tree(), '99', 'x')).toBeNull()
  })
  it('moves a page with its pages to a place under another parent', () => {
    const t = withMovedPage(tree(), '2', '4', 0)!
    expect(t.children.map((n) => n.id)).toEqual(['4'])
    expect(t.children[0].children.map((n) => n.id)).toEqual(['2'])
    expect(ids(t).sort()).toEqual(ids(tree()).sort())
  })
  it('re-orders within a parent, counting without the page', () => {
    expect(withMovedPage(tree(), '5', '2', 0)!.children[0].children.map((n) => n.id)).toEqual(['5', '3'])
    expect(withMovedPage(tree(), '2', '1', 1)!.children.map((n) => n.id)).toEqual(['4', '2'])
    expect(withMovedPage(tree(), '2', '1', 99)!.children.map((n) => n.id)).toEqual(['4', '2'])
  })
  it('refuses the top, unknown pages and a page into itself or under itself', () => {
    expect(withMovedPage(tree(), '1', '2', 0)).toBeNull()
    expect(withMovedPage(tree(), '9', '2', 0)).toBeNull()
    expect(withMovedPage(tree(), '2', '9', 0)).toBeNull()
    expect(withMovedPage(tree(), '2', '2', 0)).toBeNull()
    expect(withMovedPage(tree(), '2', '3', 0)).toBeNull()
  })
})

describe('withMoved', () => {
  it('records the old address of every page whose address changed, below the page too', () => {
    const before = tree()
    const after = withMovedPage(before, '2', '4', 0)!
    expect(withMoved({}, before, after)).toEqual({ t2: '2', 't2/t3': '3', 't2/t5': '5' })
  })
  it('does not record pages that only changed place among siblings, and drops addresses in use again', () => {
    const before = tree()
    expect(withMoved({}, before, withMovedPage(before, '4', '1', 0)!)).toEqual({})
    const renamed = withTitle(before, '4', 'Other')!
    const back = withMoved(withMoved({}, before, renamed), renamed, before)
    expect(back).toEqual({ other: '4' }) // t4 is the address again, so it is no longer a redirect
  })
  it('drops redirects to pages that are gone', () => {
    expect(withMoved({ gone: '99' }, tree(), tree())).toEqual({})
  })
})

describe('sameIds', () => {
  it('compares the pages, not their places', () => {
    expect(sameIds(tree(), withMovedPage(tree(), '2', '4', 0)!)).toBe(true)
    expect(sameIds(tree(), node('1', [node('2')]))).toBe(false)
  })
})

describe('changeTree', () => {
  it('is for admins only', async () => {
    const repo = new MemoryRepo(tree())
    expect(await changeTree(repo, { ...admin, groups: ['editors'] }, { action: 'rename', page: '2', title: 'x' })).toEqual({ status: 'forbidden' })
    expect(repo.commits).toEqual([])
  })
  it('renames in one commit, keeping the old address', async () => {
    const repo = new MemoryRepo(tree())
    const r = await changeTree(repo, admin, { action: 'rename', page: '2', title: 'Two' })
    expect(r.status).toBe('done')
    expect(repo.commits).toHaveLength(1)
    expect(repo.commits[0].index.children[0].title).toBe('Two')
    expect(repo.commits[0].moved).toEqual({ t2: '2', 't2/t3': '3', 't2/t5': '5' })
    expect(repo.commits[0].message.headline).toBe('T2: Jon renamed the page to Two')
    expect(repo.commits[0].message.body).toContain('Rename-Page: 2')
  })
  it('moves, and undoes with the tree it handed back', async () => {
    const repo = new MemoryRepo(tree())
    const r = await changeTree(repo, admin, { action: 'move', page: '5', parent: '4', position: 0 })
    if (r.status !== 'done') throw new Error('not done')
    expect(repo.index.children[1].children.map((n) => n.id)).toEqual(['5'])
    expect((await changeTree(repo, admin, { action: 'restore', index: r.before })).status).toBe('done')
    expect(repo.index).toEqual(tree())
    expect(repo.moved).toEqual({ 't4/t5': '5' }) // the address it briefly had still leads to it
  })
  it('will not undo over pages that were added or deleted since', async () => {
    const repo = new MemoryRepo(node('1', [node('2')]))
    const r = await changeTree(repo, admin, { action: 'restore', index: tree() })
    expect(r.status).toBe('invalid')
  })
  it('says invalid for a page into itself, and tries again when someone saved first', async () => {
    expect((await changeTree(new MemoryRepo(tree()), admin, { action: 'move', page: '2', parent: '3', position: 0 })).status).toBe('invalid')
    const repo = new MemoryRepo(tree(), true)
    expect((await changeTree(repo, admin, { action: 'rename', page: '4', title: 'Four' })).status).toBe('done')
    expect(repo.commits).toHaveLength(1)
  })
})
