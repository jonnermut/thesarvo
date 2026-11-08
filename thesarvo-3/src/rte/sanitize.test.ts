import { describe, expect, it } from 'vitest'
import { embedUrl } from './embed'
import { hasContent, sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('keeps the formatting the editor makes', () => {
    const html = '<h2>Access</h2><p>Walk <strong>north</strong>, then <em>left</em>.</p><ul><li>one</li></ul><blockquote>q</blockquote>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('drops scripts, handlers, styles and unknown tags but keeps their text', () => {
    expect(sanitizeHtml('<p onclick="x()" style="color:red">hi<script>alert(1)</script><font>there</font></p>')).toBe('<p>hithere</p>')
    expect(sanitizeHtml('<svg><circle/></svg><p>ok</p>')).toBe('<p>ok</p>')
  })

  it('allows safe links only, and marks outside ones', () => {
    expect(sanitizeHtml('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<p><a href="//evil.example/x">x</a></p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<p><a href="https://example.com/a">x</a></p>')).toBe('<p><a href="https://example.com/a" rel="noopener noreferrer nofollow">x</a></p>')
    expect(sanitizeHtml('<p><a href="/g/west/conical-rocks/">x</a></p>')).toBe('<p><a href="/g/west/conical-rocks/">x</a></p>')
    expect(sanitizeHtml('<p><a data-page="Apsley Edge">x</a></p>')).toBe('<p><a data-page="Apsley Edge">x</a></p>')
  })

  it('allows https or site images and pictures kept by file name', () => {
    expect(sanitizeHtml('<p><img src="javascript:x" alt="a"></p>')).toBe('')
    expect(sanitizeHtml('<img src="http://example.com/a.jpg">')).toBe('')
    expect(sanitizeHtml('<img src="/images/7/a.jpg" alt="a" width="300">')).toBe('<img src="/images/7/a.jpg" alt="a" width="300">')
    expect(sanitizeHtml('<img data-file="a b.jpg" alt="">')).toBe('<img data-file="a b.jpg" alt="">')
  })

  it('keeps notes, columns and tables of the old pages', () => {
    const html = '<div class="note"><p>n</p></div><div class="columns"><div><p>a</p></div></div><table><tbody><tr><td colspan="2">c</td></tr></tbody></table>'
    expect(sanitizeHtml(html)).toBe(html)
    expect(sanitizeHtml('<div class="evil"><p>x</p></div>')).toBe('<div><p>x</p></div>')
  })

  it('allows an iframe only as a known player inside an embed frame', () => {
    const player = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    const ok = sanitizeHtml(`<div class="embed"><iframe src="${player}"></iframe></div>`)
    expect(ok).toContain(`src="${player}"`)
    expect(ok).toContain('allowfullscreen')
    expect(sanitizeHtml(`<iframe src="${player}"></iframe>`)).toBe('')
    expect(sanitizeHtml('<div class="embed"><iframe src="https://evil.example/x"></iframe></div>')).toBe('')
    expect(sanitizeHtml('<div class="embed"><iframe src="javascript:alert(1)"></iframe></div>')).toBe('')
  })

  it('trims empty trailing paragraphs', () => {
    expect(sanitizeHtml('<p>a</p><p></p><p></p>')).toBe('<p>a</p>')
  })
})

describe('hasContent', () => {
  it('is false for an emptied editor', () => {
    expect(hasContent('<p></p>')).toBe(false)
    expect(hasContent('<p> </p>')).toBe(false)
    expect(hasContent('<p>a</p>')).toBe(true)
    expect(hasContent('<img src="/images/7/a.jpg">')).toBe(true)
  })
})

describe('embedUrl', () => {
  it('makes player addresses for YouTube and Vimeo links', () => {
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(embedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(embedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
  })

  it('refuses anything else', () => {
    expect(embedUrl('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(embedUrl('not a url')).toBeNull()
    expect(embedUrl('https://www.youtube.com/watch')).toBeNull()
  })
})

describe('sanitizeHtml, guide profile', () => {
  const g = (html: string) => sanitizeHtml(html, 'guide')
  it('keeps paragraphs, breaks, bold, italic, lists and links', () => {
    const html = '<p>One <strong>two</strong> <em>three</em><br>four</p><ul><li>a</li></ul><ol><li>b</li></ol>'
    expect(g(html)).toBe(html)
    expect(g('<p><a href="mailto:a@b.test">mail</a> <a href="tel:+61400000000">call</a> <a data-page="Apsley Edge">page</a></p>')).toContain('data-page="Apsley Edge"')
    expect(g('<p><a href="tel:+61400000000">call</a></p>')).toContain('href="tel:+61400000000"')
  })
  it('keeps where a numbered list starts, as a number only', () => {
    expect(g('<ol start="5"><li>a</li></ol>')).toBe('<ol start="5"><li>a</li></ol>')
    expect(g('<ol start="x" onclick="y"><li>a</li></ol>')).toBe('<ol><li>a</li></ol>')
  })
  it('drops everything else the page profile allows', () => {
    expect(g('<h2>H</h2><blockquote>q</blockquote><p><u>u</u><s>s</s></p><hr><img data-file="a.jpg"><div class="embed"><iframe src="https://www.youtube.com/embed/x"></iframe></div>')).toBe('<p>H</p><p>q</p><p>us</p>')
  })
  it('does not let a link keep a file reference, nor script', () => {
    expect(g('<p><a data-file="a.pdf">x</a></p>')).not.toContain('data-file')
    expect(g('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p>x</p>')
  })
})
