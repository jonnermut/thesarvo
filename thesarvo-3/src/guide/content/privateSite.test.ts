import { describe, expect, it } from 'vitest'
import { privateAccess, publicTree } from './access'
import { pageDecision, readableGrafts, withGrafts } from './privateSite'
import type { IndexNode } from './types'

const node = (id: string, children: IndexNode[] = []): IndexNode => ({ id, title: `P${id}`, path: `p${id}`, isGuide: true, children })
const tree = node('1', [node('2', [node('3')]), node('4', [node('5', [node('6')])]), node('7')])
const access = { '2': { groups: ['cct-members'] }, '5': { groups: ['cct-members'] }, '4': { signedIn: true as const } }

describe('readableGrafts', () => {
  it('gives nothing to anonymous visitors', () => {
    expect(readableGrafts(tree, access, null)).toEqual([])
  })
  it('gives signed-in users their pages, pruned below, marked private', () => {
    const g = readableGrafts(tree, access, [])
    expect(g.map((x) => [x.parent, x.node.id, x.node.children.map((c) => c.id)])).toEqual([['1', '4', []]])
    expect(g[0]?.node.private).toBe(true)
  })
  it('gives members every page they are in the group for, and admins all', () => {
    expect(readableGrafts(tree, access, ['cct-members']).map((x) => x.node.id)).toEqual(['2', '4'])
    expect(readableGrafts(tree, access, ['cct-members'])[1]?.node.children.map((c) => c.id)).toEqual(['5'])
    expect(readableGrafts(tree, access, ['admins']).map((x) => x.node.id)).toEqual(['2', '4'])
  })
})

describe('pageDecision', () => {
  it('tells public, allowed and denied apart, with inheritance', () => {
    expect(pageDecision(tree, access, '7', null)).toBe('public')
    expect(pageDecision(tree, access, '3', null)).toBe('denied')
    expect(pageDecision(tree, access, '3', ['cct-members'])).toBe('allowed')
    expect(pageDecision(tree, access, '6', [])).toBe('denied')
    expect(pageDecision(tree, access, '4', [])).toBe('allowed')
  })
})

describe('withGrafts', () => {
  it('puts subtrees back in their place in the public tree and leaves the original alone', () => {
    const open = publicTree(tree, privateAccess(tree, access))
    expect(open.children.map((c) => c.id)).toEqual(['7'])
    const merged = withGrafts(open, readableGrafts(tree, access, ['admins']))
    expect(merged.children.map((c) => c.id)).toEqual(['2', '4', '7'])
    expect(merged.children.filter((c) => c.private).map((c) => c.id)).toEqual(['2', '4'])
    expect(open.children.map((c) => c.id)).toEqual(['7'])
  })
})
