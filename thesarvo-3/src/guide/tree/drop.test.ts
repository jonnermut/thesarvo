import { describe, expect, it } from 'vitest'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { dropPlace, stepPlace, zoneAt } from './drop'

const n = (id: string, children: StoredIndexNode[] = []): StoredIndexNode => ({ id, title: `T${id}`, children })
// 1: 2 (3, 5), 4, 6
const tree = n('1', [n('2', [n('3'), n('5')]), n('4'), n('6')])

describe('zoneAt', () => {
  it('splits a row into quarters', () => {
    expect([zoneAt(2, 40), zoneAt(20, 40), zoneAt(38, 40)]).toEqual(['above', 'into', 'below'])
  })
})

describe('dropPlace', () => {
  it('drops onto a page as its last child', () => {
    expect(dropPlace(tree, '4', '2', 'into')).toEqual({ parent: '2', position: 2 })
    expect(dropPlace(tree, '3', '4', 'into')).toEqual({ parent: '4', position: 0 })
  })
  it('drops above or below a page as its sibling, counting without the dragged page', () => {
    expect(dropPlace(tree, '6', '2', 'above')).toEqual({ parent: '1', position: 0 })
    expect(dropPlace(tree, '2', '6', 'below')).toEqual({ parent: '1', position: 2 })
    expect(dropPlace(tree, '2', '4', 'above')).toBeNull() // already there
    expect(dropPlace(tree, '4', '3', 'below')).toEqual({ parent: '2', position: 1 })
  })
  it('refuses the top, itself and its own pages', () => {
    expect(dropPlace(tree, '1', '4', 'into')).toBeNull()
    expect(dropPlace(tree, '2', '2', 'into')).toBeNull()
    expect(dropPlace(tree, '2', '3', 'into')).toBeNull()
    expect(dropPlace(tree, '4', '1', 'above')).toBeNull()
    expect(dropPlace(tree, '9', '4', 'into')).toBeNull()
  })
})

describe('stepPlace', () => {
  it('moves among siblings, in and out', () => {
    expect(stepPlace(tree, '4', 'up')).toEqual({ parent: '1', position: 0 })
    expect(stepPlace(tree, '2', 'up')).toBeNull()
    expect(stepPlace(tree, '4', 'down')).toEqual({ parent: '1', position: 2 })
    expect(stepPlace(tree, '6', 'down')).toBeNull()
    expect(stepPlace(tree, '4', 'in')).toEqual({ parent: '2', position: 2 })
    expect(stepPlace(tree, '2', 'in')).toBeNull()
    expect(stepPlace(tree, '5', 'out')).toEqual({ parent: '1', position: 1 })
    expect(stepPlace(tree, '4', 'out')).toBeNull()
    expect(stepPlace(tree, '1', 'down')).toBeNull()
  })
})
