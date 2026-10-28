import { describe, expect, it } from 'vitest'
import { guideXmlOf, historyFromVersions, IMPORTED, parseVersion, unescapeBatch } from './confluenceHistory'
import type { Person, Version } from './confluenceHistory'

const body = (...climbs: string[]) =>
  `<ac:structured-macro ac:name="guide"><ac:plain-text-body><![CDATA[<guide><header id="1" name="Crag"/>${climbs.map((c, i) => `<climb id="${i + 2}" name="${c}"/>`).join('')}</guide>]]></ac:plain-text-body></ac:structured-macro>`
const version = (n: number, climbs: string[], more: Partial<Version> = {}): Version => ({
  id: String(100 + n), version: n, at: `2020-01-${String(n).padStart(2, '0')} 10:00:00`, userKey: 'k1', comment: 'Guide edited', body: body(...climbs), ...more,
})
const ann: Person = { sub: 'confluence:ann', name: 'Ann' }
const who = (k: string | null) => (k === 'k1' ? ann : undefined)

describe('reading a stored version', () => {
  it('finds the guide inside the macro and undoes mysql escapes', () => {
    expect(guideXmlOf(body('A'))).toMatch(/^<guide>.*<\/guide>$/)
    expect(guideXmlOf('<p>text</p>')).toBeNull()
    expect(guideXmlOf('{guide}<?xml version="1.0"?>\n<guide><header id="1"/></guide>{guide}\r\n\\\\\r\n{attachments}')).toBe('<guide><header id="1"/></guide>')
    expect(guideXmlOf('<ac:plain-text-body><![CDATA[a]]]]><![CDATA[>b]]></ac:plain-text-body>')).toBe('a]]>b')
    expect(unescapeBatch('a\\tb\\nc\\\\n')).toBe('a\tb\nc\\n')
  })
  it('gives null for what is not a guide', () => {
    expect(parseVersion('1', '<p>nope</p>')).toBeNull()
    expect(parseVersion('1', body('A'))?.nodes).toHaveLength(2)
  })
})

describe('historyFromVersions', () => {
  const v = [version(1, ['A']), version(2, ['A', 'B']), version(3, ['A', 'B', 'C'], { comment: 'Added Cat', userKey: null })]
  it('makes one entry per version after the first, oldest first', () => {
    const h = historyFromVersions('1', v, who, 20)
    expect(h.map((e) => e.description)).toEqual(['added the climb B', 'added the climb C'])
    expect(h.map((e) => e.session)).toEqual([`${IMPORTED}102`, `${IMPORTED}103`])
    expect(h[0]).toMatchObject({ user: ann, start: '2020-01-02T10:00:00.000Z', saves: 1, note: 'Imported from Confluence' })
    expect(h[1]).toMatchObject({ user: { name: 'Unknown' }, note: 'Imported from Confluence: Added Cat' })
  })
  it('squashes versions older than the last `keep` into one entry that credits everyone', () => {
    const many = [version(1, ['A']), version(2, ['A', 'B'], { userKey: 'k2' }), version(3, ['A', 'B', 'C']), version(4, ['A', 'B', 'C', 'D']), version(5, ['A', 'B', 'C', 'D', 'E'])]
    const h = historyFromVersions('1', many, (k) => (k === 'k2' ? { sub: 'confluence:bob', name: 'Bob' } : ann), 2)
    expect(h.map((e) => e.description)).toEqual(['2 earlier edits (2020-01-01 to 2020-01-03): added the climb B and the climb C', 'added the climb D', 'added the climb E'])
    expect(h[0]).toMatchObject({ saves: 2, start: '2020-01-01T10:00:00.000Z', end: '2020-01-03T10:00:00.000Z', note: 'Imported from Confluence. By Ann, Bob.' })
  })
  it('notes a version it cannot read and carries on from the last good one', () => {
    const h = historyFromVersions('1', [version(1, ['A']), version(2, [], { body: '<p>broken</p>' }), version(3, ['A', 'B'])], who, 20)
    expect(h[0].description).toMatch(/could not be read/)
    expect(h[0].nodes).toEqual({})
    expect(h[1].description).toBe('added the climb B')
  })
  it('makes one entry of the edits from before the guide was in a readable format', () => {
    const old = { body: '<p>{html} old page</p>' }
    const h = historyFromVersions('1', [version(1, [], old), version(2, [], old), version(3, [], old), version(4, ['A']), version(5, ['A', 'B'])], who, 2)
    expect(h.map((e) => e.description)).toEqual(['2 earlier edits (2020-01-01 to 2020-01-03) in the old page format', 'added the climb B'])
    expect(h[0]).toMatchObject({ user: { name: 'Earlier editors' }, saves: 2, nodes: {} })
  })
  it('skips versions that changed nothing', () => {
    expect(historyFromVersions('1', [version(1, ['A']), version(2, ['A'])], who, 20)).toEqual([])
  })
})
