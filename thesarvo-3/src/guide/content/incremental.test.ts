import { describe, expect, it } from 'vitest'
import { pagesToRebuild, treeHashes } from './incremental'
import type { IndexNode } from './types'

const node = (id: string, children: IndexNode[] = []): IndexNode => ({ id, title: id, path: id, isGuide: true, children })
const tree = (b = 'b', extra: IndexNode[] = []) =>
  node('root', [node('a', [node('a1', [node('a1x')]), node('a2')]), node(b, [node('b1')]), ...extra])

const hashes = (root: IndexNode, bodies: Record<string, string> = {}) => treeHashes(root, async (n) => bodies[n.id] ?? '', (s) => s)
const ids = (nodes: IndexNode[]) => nodes.map((n) => n.id)

describe('pagesToRebuild', () => {
  it('rebuilds nothing when nothing changed', async () => {
    expect(pagesToRebuild(tree(), await hashes(tree()), await hashes(tree()))).toEqual([])
  })

  it('rebuilds only the page whose content changed', async () => {
    expect(ids(pagesToRebuild(tree(), await hashes(tree()), await hashes(tree(), { a1: 'new climb' })))).toEqual(['a1'])
  })

  it('rebuilds a renamed page, what is below it, its parent, siblings and grandparent', async () => {
    const next = tree()
    next.children[0].children[0].title = 'Renamed'
    expect(ids(pagesToRebuild(next, await hashes(tree()), await hashes(next)))).toEqual(['root', 'a', 'a1', 'a1x', 'a2'])
  })

  it('rebuilds a parent and its children when a page is added or removed', async () => {
    const added = tree('b', [node('c')])
    expect(ids(pagesToRebuild(added, await hashes(tree()), await hashes(added)))).toEqual(['root', 'a', 'b', 'c'])
    const removed = node('root', [tree().children[0]])
    expect(ids(pagesToRebuild(removed, await hashes(tree()), await hashes(removed)))).toEqual(['root', 'a'])
  })
})
