import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { extensions } from './extensions'

const roundtrip = (html: string, compact = false) => {
  const editor = new Editor({ extensions: extensions({ resolve: (f) => `/x/${f}`, compact }), content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

describe('the editor schema', () => {
  it('keeps formatting, links and the old pages’ kinds of link', () => {
    const html = '<h2>Access</h2><p>Walk <strong>north</strong> then <em>left</em>, see <a href="https://example.com/a">this</a> and <a data-page="Apsley Edge">that</a>.</p><ul><li><p>one</p></li></ul>'
    const out = roundtrip(html)
    expect(out).toContain('<h2>Access</h2>')
    expect(out).toContain('<strong>north</strong>')
    expect(out).toContain('href="https://example.com/a"')
    expect(out).toContain('data-page="Apsley Edge"')
    expect(out).toContain('<li><p>one</p></li>')
  })

  it('keeps pictures by file name, never by the address they are shown from', () => {
    expect(roundtrip('<p><img data-file="a b.jpg" alt="x" width="300"></p>')).toBe('<p><img data-file="a b.jpg" alt="x" width="300"></p>')
  })

  it('keeps a video embed and notes, but a comment box has neither', () => {
    const embed = '<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></div>'
    expect(roundtrip(embed)).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')
    expect(roundtrip(embed, true)).not.toContain('iframe')
    expect(roundtrip('<div class="note"><p>n</p></div>')).toContain('class="note"')
  })
})
