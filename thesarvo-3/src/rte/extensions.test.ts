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

describe('typing a link in the guide profile', () => {
  const typed = (chars: string[]) => {
    const editor = new Editor({ extensions: extensions({ resolve: (f) => f, guide: true }), content: '<p>See</p>' })
    editor.commands.focus('end')
    // One transaction per key, as typing makes them (a whole string inserted at once is not a typed word).
    for (const c of chars) editor.view.dispatch(editor.state.tr.insertText(c))
    const out = editor.getHTML()
    editor.destroy()
    return out
  }
  it('turns a typed address into a link once a space follows it', () => {
    expect(typed([...' https://thesarvo.com now'])).toBe('<p>See <a rel="noopener noreferrer nofollow" href="https://thesarvo.com">https://thesarvo.com</a> now</p>')
  })
  it('adds https to a bare domain, and leaves ordinary words alone', () => {
    expect(typed([...' thesarvo.com is good '])).toContain('href="https://thesarvo.com"')
    expect(typed([...' no link here '])).not.toContain('<a')
  })
})
