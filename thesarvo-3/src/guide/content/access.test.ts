import { describe, expect, it } from 'vitest'
import { canRead, parseAccess, privateAccess, publicSource, publicTree } from './access'
import type { ContentSource, IndexNode } from './types'

const node = (id: string, children: IndexNode[] = []): IndexNode => ({ id, title: `Page ${id}`, path: id === '1' ? '' : `p${id}`, isGuide: true, children })
const tree = node('1', [node('2', [node('3'), node('4')]), node('5', [node('6')]), node('7')])

describe('parseAccess', () => {
  it('reads groups and draft', () => {
    expect(parseAccess('{"2":{"groups":["cct-members"]},"7":{"draft":true}}')).toEqual({ '2': { groups: ['cct-members'] }, '7': { draft: true } })
  })
  it('has no entries when there is no file', () => expect(parseAccess(null)).toEqual({}))
  it.each([
    ['[]'],
    ['{"2":[]}'],
    ['{"2":{"group":["a"]}}'],
    ['{"2":{"groups":"a"}}'],
    ['{"2":{"groups":[""]}}'],
    ['{"2":{"draft":false}}'],
  ])('refuses %s, so a typo never makes a page public', (text) => expect(() => parseAccess(text)).toThrow(/access.json/))
})

describe('privateAccess', () => {
  it('covers a page and everything below it, with the nearest entry', () => {
    const map = privateAccess(tree, { '2': { groups: ['a'] }, '4': { groups: ['b'] } })
    expect([...map.keys()].sort()).toEqual(['2', '3', '4'])
    expect(map.get('3')).toEqual({ groups: ['a'] })
    expect(map.get('4')).toEqual({ groups: ['b'] })
  })
})

describe('canRead', () => {
  it('lets admins read everything, and others only their groups', () => {
    expect(canRead({ draft: true }, ['admins'])).toBe(true)
    expect(canRead({ draft: true }, ['cct-members'])).toBe(false)
    expect(canRead({ groups: ['cct-members'] }, ['cct-members'])).toBe(true)
    expect(canRead({ groups: ['cct-members'] }, ['other'])).toBe(false)
    expect(canRead({ groups: ['cct-members'] }, [])).toBe(false)
  })
})

describe('publicTree and publicSource', () => {
  const hidden = privateAccess(tree, { '2': { groups: ['a'] }, '7': { draft: true } })
  it('drops private pages and their descendants', () => {
    const ids = (n: IndexNode): string[] => [n.id, ...n.children.flatMap(ids)]
    expect(ids(publicTree(tree, hidden))).toEqual(['1', '5', '6'])
  })
  it('answers nothing for a private id', async () => {
    const calls: string[] = []
    const inner: ContentSource = {
      getIndex: () => Promise.resolve(tree),
      getGuide: (id) => (calls.push(`guide ${id}`), Promise.resolve({ id } as never)),
      getPageBody: (id) => (calls.push(`body ${id}`), Promise.resolve('<p>secret</p>')),
      getHistory: (id) => (calls.push(`history ${id}`), Promise.resolve([{}] as never)),
      listImages: (id) => (calls.push(`images ${id}`), Promise.resolve(['a.jpg'])),
      saveImage: () => Promise.resolve('x'),
      readFile: () => Promise.resolve(null),
    }
    const source = publicSource(inner, () => Promise.resolve({ '2': { groups: ['a'] }, '7': { draft: true } }))
    for (const id of ['2', '3', '4', '7']) {
      expect(await source.getGuide(id)).toBeNull()
      expect(await source.getPageBody(id)).toBeNull()
      expect(await source.getHistory(id)).toEqual([])
      expect(await source.listImages(id)).toEqual([])
    }
    expect(calls).toEqual([])
    expect(await source.getGuide('5')).not.toBeNull()
    expect((await source.getIndex()).children.map((c) => c.id)).toEqual(['5'])
  })
})
