import { describe, expect, it } from 'vitest'
import { htmlToText, needsFormatting, textToHtml, textToParas } from './richify'

describe('textToHtml', () => {
  it('keeps the closing bracket of an address that has an opening one, and leaves a bracket around an address out', () => {
    expect(textToHtml('see http://x.org/a-(b-c) now')).toContain('href="http://x.org/a-(b-c)"')
    expect(textToHtml('(see http://x.org/a)')).toContain('href="http://x.org/a"')
  })

  it('starts a paragraph at a single break after a finished sentence, unless both lines are short', () => {
    expect(textToHtml('Park at the chain gate beside the vineyard sign.<br/>For the other crag, drive a few km on.')).toBe('<p>Park at the chain gate beside the vineyard sign.</p><p>For the other crag, drive a few km on.</p>')
    expect(textToHtml('Joe Bloggs.<br/>0400 000 000')).toBe('<p>Joe Bloggs.<br>0400 000 000</p>')
    expect(textToHtml('Access:<br/>park at the gate and walk in for twenty minutes along the river.')).toBe('<p>Access:<br>park at the gate and walk in for twenty minutes along the river.</p>')
  })

  it('makes a paragraph of a line and a <br> of a single line break', () => {
    expect(textToHtml('One line')).toBe('<p>One line</p>')
    expect(textToHtml('a<br/>b')).toBe('<p>a<br>b</p>')
  })
  it('splits on blank lines and drops blank-space lines and rules', () => {
    expect(textToHtml('a<br/>  <br/>b<br/><br/><br/>-------------<br/><br/>c')).toBe('<p>a</p><p>b</p><p>c</p>')
  })
  it('escapes markup characters', () => {
    expect(textToHtml('5 < 6 & <b>x')).toBe('<p>5 &lt; 6 &amp; &lt;b&gt;x</p>')
  })
  it('turns bullet lines into a list, but not one lone dash or star', () => {
    expect(textToHtml('Please:<br/>• one<br/>• two')).toBe('<p>Please:</p><ul><li>one</li><li>two</li></ul>')
    expect(textToHtml('- a<br/>- b<br/>- c')).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
    expect(textToHtml('- just one')).toBe('<p>- just one</p>')
    expect(textToHtml('* - route is worthwhile ** - route is very good *** - a must-do')).toBe('<p>* - route is worthwhile ** - route is very good *** - a must-do</p>')
  })
  it('turns numbered lines into an ordered list and keeps where it starts', () => {
    expect(textToHtml('1. Drive<br/>2. Walk')).toBe('<ol><li>Drive</li><li>Walk</li></ol>')
    expect(textToHtml('3. c<br/>4. d')).toBe('<ol start="3"><li>c</li><li>d</li></ol>')
    expect(textToHtml('1. only one')).toBe('<p>1. only one</p>')
  })
  it('makes **bold** and *italic*, and bolds a capital label', () => {
    expect(textToHtml('a **b** and *c*')).toBe('<p>a <strong>b</strong> and <em>c</em></p>')
    expect(textToHtml('THE DRIVE: go<br/>there')).toBe('<p><strong>THE DRIVE:</strong> go<br>there</p>')
  })
  it('links web and email addresses, keeping the full stop outside', () => {
    expect(textToHtml('See https://a.example/x?y=1. Mail me@b.org.au now')).toBe('<p>See <a href="https://a.example/x?y=1" rel="noopener noreferrer nofollow">https://a.example/x?y=1</a>. Mail <a href="mailto:me@b.org.au">me@b.org.au</a> now</p>')
  })
  it('gives nothing for empty text', () => {
    expect(textToHtml('')).toBe('')
    expect(textToHtml('<br/><br/>')).toBe('')
  })
})

describe('textToParas', () => {
  it('takes notices out of the text, with the label off', () => {
    expect(textToParas('**CLOSED for now**<br/><br/>Access is by foot.<br/><br/>WARNING: rockfall.<br/><br/>NOTE: take a rope')).toEqual([
      { kind: 'warning', html: 'CLOSED for now' },
      { html: '<p>Access is by foot.</p>' },
      { kind: 'warning', html: 'rockfall.' },
      { kind: 'note', html: 'take a rope' },
    ])
  })
  it('leaves a paragraph that only starts with bold, and other-case labels, where they are', () => {
    expect(textToParas('***VERY IMPORTANT ! *** This guide is for experts')[0]?.kind).toBeUndefined()
    expect(textToParas('Note: DFHB means double hangers')[0]?.kind).toBeUndefined()
  })
})

describe('needsFormatting', () => {
  it('is false for one plain paragraph and true for anything more', () => {
    expect(needsFormatting(textToParas('Just words, "quoted".'))).toBe(false)
    expect(needsFormatting(textToParas('a<br/><br/>b'))).toBe(true)
    expect(needsFormatting(textToParas('See https://a.example'))).toBe(true)
    expect(needsFormatting(textToParas('a<br/>b'))).toBe(true)
  })
})

describe('htmlToText', () => {
  it('goes back to text with <br/>', () => {
    expect(htmlToText('<p>a</p><p>b<br>c</p><ul><li>x</li><li>y</li></ul><p>d &amp; e</p>')).toBe('a<br/><br/>b<br/>c<br/><br/>• x<br/>• y<br/><br/>d & e')
    expect(htmlToText('<p>See <a href="https://a.example/x">the page</a> or <a href="https://a.example">https://a.example</a></p>')).toBe('See the page (https://a.example/x) or https://a.example')
  })
  it('round trips plain structure', () => {
    const text = 'a<br/><br/>• x<br/>• y<br/><br/>b'
    expect(htmlToText(textToHtml(text))).toBe(text)
  })
})
