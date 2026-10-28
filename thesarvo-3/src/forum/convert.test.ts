import { describe, expect, it } from 'vitest'
import { toThread } from './convert'
import type { CommentRow, PostRow } from './convert'
import { metaOf } from './types'

const post: PostRow = { id: '1', title: 'New Routes', creator: 'k1', created: '2013-05-06 07:08:09', body: '<p>Two new routes at <strong>Fossil Cove</strong>.</p>', space: 'thesarvo' }
const c = (id: string, parent: string | null, body: string, created: string): CommentRow => ({ id, post: '1', parent, creator: id === '3' ? null : 'k1', created, body })

describe('toThread', () => {
  const who = (k: string | null) => (k === 'k1' ? { sub: 'confluence:jon', name: 'Jon' } : undefined)
  const t = toThread(post, [c('4', '3', '<p>reply</p>', '2013-05-08 00:00:00'), c('2', null, '<p>first</p>', '2013-05-07 00:00:00'), c('3', '2', '<p></p>', '2013-05-07 01:00:00')], who)

  it('keeps the post with its author and a UTC time', () => {
    expect(t).toMatchObject({ id: '1', title: 'New Routes', author: { name: 'Jon' }, at: '2013-05-06T07:08:09Z' })
    expect(t.html).toContain('Fossil Cove')
    expect(t.group).toBeUndefined()
  })
  it('orders comments by time, drops empty ones and moves their replies up', () => {
    expect(t.comments.map((x) => [x.id, x.parent])).toEqual([['2', null], ['4', '2']])
  })
  it('marks the CCT forum for its group, and unknown authors', () => {
    expect(toThread({ ...post, space: 'cct' }, [], who).group).toBe('cct-members')
    expect(toThread({ ...post, creator: 'zz' }, [], who).author.name).toBe('Unknown')
  })
  it('summarises a thread for the list', () => {
    expect(metaOf(t)).toMatchObject({ id: '1', comments: 2, last: '2013-05-08T00:00:00Z' })
  })
})
