import { describe, expect, it } from 'vitest'
import { groupsFor, parseConfluenceGroups, parseGroups, withMembers } from './groups'

describe('groups table', () => {
  it('parses, treats a missing file as empty, and refuses a malformed one', () => {
    expect(parseGroups(null)).toEqual({})
    expect(parseGroups('{"cct-members":["a@x.com"]}')).toEqual({ 'cct-members': ['a@x.com'] })
    expect(() => parseGroups('[]')).toThrow('expected an object')
    expect(() => parseGroups('{"g":["nope"]}')).toThrow('g: expected a list of emails')
  })

  it('finds a person by email whatever its case', () => {
    expect(groupsFor({ a: ['x@y.com'], b: ['z@y.com'], c: ['x@y.com'] }, ' X@Y.com ')).toEqual(['a', 'c'])
    expect(groupsFor({}, 'x@y.com')).toEqual([])
  })

  it('adds members, counting new and already-present, and only drops when replacing', () => {
    const t = { g: ['a@x.com', 'b@x.com'] }
    const add = withMembers(t, 'g', ['B@x.com', 'c@x.com', 'c@x.com'])
    expect(add).toMatchObject({ table: { g: ['a@x.com', 'b@x.com', 'c@x.com'] }, added: 1, already: 1, dropped: 0 })
    const swap = withMembers(t, 'g', ['c@x.com'], true)
    expect(swap).toMatchObject({ table: { g: ['c@x.com'] }, added: 1, already: 0, dropped: 2 })
    expect(withMembers(t, 'new', ['q@x.com']).table).toEqual({ g: t.g, new: ['q@x.com'] })
    expect(t.g).toEqual(['a@x.com', 'b@x.com'])
  })
})

describe('parseConfluenceGroups', () => {
  it('maps Confluence groups to roles, skips admins and unknown groups and bad emails, and dedupes', () => {
    const tsv = 'group_name\temail\nCCTMembers\tAnn@x.com\nCCTMembers\tann@x.com\nCCTMembers\tNULL\nMountainGuideEditors\tbob@x.com\nconfluence-administrators\tjon@x.com\nOther\tq@x.com\n'
    expect(parseConfluenceGroups(tsv)).toEqual({ 'cct-members': ['ann@x.com'], editors: ['bob@x.com'] })
  })
})
