import { describe, expect, it } from 'vitest'
import type { Header, TextBlock } from '#/guide/model/types'
import { cleanChanges, cleanNode } from './cleanRich'
import { parseSaveRequest } from './validate'

const header: Header = { type: 'header', id: 'h', name: 'Bruny', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }
const text = (cls: string, t: string): TextBlock => ({ type: 'text', id: '5', cls, text: t })

describe('cleanNode', () => {
  it('puts the rich fields of a header through the guide profile, and leaves plain fields alone', () => {
    const out = cleanNode({ ...header, rich: ['intro'], intro: '<p onclick="x()">Hi <u>there</u><script>1</script></p><h2>H</h2>', access: '<b>kept as typed</b> & more' })
    expect(out).toMatchObject({ intro: '<p>Hi there</p><p>H</p>', access: '<b>kept as typed</b> & more' })
  })
  it('cleans notices, keeping an empty one the editor has just added', () => {
    const out = cleanNode({ ...header, notices: [{ kind: 'warning', html: '<p>Closed <img src="https://x.test/a.png"></p>' }, { kind: 'note', html: '<p></p>' }] })
    expect(out).toMatchObject({ notices: [{ kind: 'warning', html: '<p>Closed </p>' }, { kind: 'note', html: '' }] })
  })
  it('keeps the steward email to an address and nothing else', () => {
    expect(cleanNode({ ...header, stewardEmail: ' a@b.test<script>, "x" ' })).toMatchObject({ stewardEmail: 'a@b.testscriptx' })
    expect(cleanNode({ ...header, stewardEmail: 'x'.repeat(500) })).toMatchObject({ stewardEmail: 'x'.repeat(200) })
  })
  it('cleans text blocks of the rich styles only', () => {
    for (const cls of ['rich', 'note', 'warning']) expect(cleanNode(text(cls, '<p>a<script>x</script> <strong>b</strong></p>'))).toMatchObject({ text: '<p>a <strong>b</strong></p>' })
    expect(cleanNode(text('text', '<b>a</b> <script>'))).toMatchObject({ text: '<b>a</b> <script>' })
  })
  it('refuses links that run script, and drops pictures and tables', () => {
    expect(cleanNode(text('rich', '<p><a href="javascript:alert(1)">x</a> <a href="tel:+61400000000">call</a></p><table><tr><td>t</td></tr></table>'))).toMatchObject({
      text: expect.stringContaining('<a href="tel:+61400000000"') as string,
    })
    expect((cleanNode(text('rich', '<p><a href="javascript:alert(1)">x</a></p>')) as TextBlock).text).toBe('<p>x</p>')
  })
})

describe('cleanChanges', () => {
  it('cleans the after side of every change, and leaves deletions', () => {
    const changes = { nodes: [{ id: '5', before: null, after: text('rich', '<p onclick="x">a</p>') }, { id: '6', before: text('rich', '<p>old</p>'), after: null }] }
    expect(cleanChanges(changes).nodes).toEqual([{ id: '5', before: null, after: text('rich', '<p>a</p>') }, { id: '6', before: text('rich', '<p>old</p>'), after: null }])
  })
})

describe('the save request for the new header fields', () => {
  const request = (h: unknown) => ({ guide: '7', session: 'abc-1', changes: { nodes: [{ id: 'h', before: null, after: h }] } })
  it('accepts rich, notices and the steward email', () => {
    const h = { ...header, rich: ['intro', 'steward'], notices: [{ kind: 'note', html: '<p>x</p>' }], stewardEmail: 'a@b.test' }
    expect(parseSaveRequest(request(h), 'request').changes.nodes[0]?.after).toEqual(h)
  })
  it('refuses an unknown rich field, an unknown notice kind and too many notices', () => {
    expect(() => parseSaveRequest(request({ ...header, rich: ['name'] }), 'request')).toThrow()
    expect(() => parseSaveRequest(request({ ...header, notices: [{ kind: 'danger', html: '' }] }), 'request')).toThrow()
    expect(() => parseSaveRequest(request({ ...header, notices: Array.from({ length: 21 }, () => ({ kind: 'note', html: 'x' })) }), 'request')).toThrow()
  })
})
