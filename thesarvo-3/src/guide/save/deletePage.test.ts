import { describe, expect, it } from 'vitest'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { deletePage, isAdmin, parseDeletePage, withoutPage } from './deletePage'
import type { PageRepo } from './repo'

const node = (id: string, children: StoredIndexNode[] = []): StoredIndexNode => ({ id, title: `T${id}`, children })
const admin = { sub: 's1', email: 'jon@example.com', name: 'Jon', groups: ['admins'] }
const member = { ...admin, groups: ['cct-members'] }

class MemoryRepo implements PageRepo {
  commits: Parameters<PageRepo['commitIndex']>[0][] = []
  constructor(public index: StoredIndexNode, public staleOnce = false) {}
  readIndex = () => Promise.resolve({ head: `c${this.commits.length}`, index: this.index, moved: {} })
  commitPage = () => Promise.resolve(null)
  commitIndex = (c: Parameters<PageRepo['commitIndex']>[0]) => {
    if (this.staleOnce) {
      this.staleOnce = false
      this.index = { ...this.index, children: this.index.children.filter((n) => n.id !== '4') }
      return Promise.resolve(null)
    }
    this.commits.push(c)
    this.index = c.index
    return Promise.resolve(`c${this.commits.length}`)
  }
}

describe('parseDeletePage', () => {
  it('wants a page id', () => {
    expect(parseDeletePage({ page: '12' })).toEqual({ page: '12' })
    for (const bad of [null, {}, { page: '' }, { page: 'a' }, { page: 12 }]) expect(() => parseDeletePage(bad)).toThrow()
  })
})

describe('withoutPage', () => {
  const tree = node('1', [node('2', [node('3'), node('5')]), node('4')])
  it('takes a page and everything under it out of the tree', () => {
    const r = withoutPage(tree, '2')!
    expect(r.index.children.map((n) => n.id)).toEqual(['4'])
    expect(r.removed.map((n) => n.id)).toEqual(['2', '3', '5'])
    expect(withoutPage(tree, '5')!.index.children[0].children.map((n) => n.id)).toEqual(['3'])
    expect(tree.children).toHaveLength(2) // the original is untouched
  })
  it('finds nothing for an unknown page, and never removes the top of the tree', () => {
    expect(withoutPage(tree, '77')).toBeNull()
    expect(withoutPage(tree, '1')).toBeNull()
  })
})

describe('deletePage', () => {
  it('is for admins only', async () => {
    const repo = new MemoryRepo(node('1', [node('4')]))
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(member)).toBe(false)
    expect(await deletePage(repo, member, { page: '4' })).toEqual({ status: 'forbidden' })
    expect(repo.commits).toEqual([])
  })

  it('commits the tree without the page, naming who and what in the commit', async () => {
    const repo = new MemoryRepo(node('1', [node('2', [node('3')]), node('4')]))
    expect(await deletePage(repo, admin, { page: '2' })).toEqual({ status: 'deleted', ids: ['2', '3'] })
    expect(repo.commits[0].index.children.map((n) => n.id)).toEqual(['4'])
    expect(repo.commits[0].message.headline).toBe('T2: Jon deleted the page and 1 under it')
    expect(repo.commits[0].message.body).toContain('Delete-Page: 2 3')
  })

  it('says when there is no such page, and tries again when someone saved meanwhile', async () => {
    expect(await deletePage(new MemoryRepo(node('1')), admin, { page: '9' })).toEqual({ status: 'missing' })
    const repo = new MemoryRepo(node('1', [node('4'), node('6')]), true)
    expect(await deletePage(repo, admin, { page: '6' })).toEqual({ status: 'deleted', ids: ['6'] })
    expect(repo.index.children.map((n) => n.id)).toEqual([])
  })
})
