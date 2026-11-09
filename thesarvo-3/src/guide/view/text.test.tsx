import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { paragraphs, sentenceParas, tidyBreaks } from './breaks'
import { Lines, splitLines } from './text'

it('splits on <br/> in any common spelling', () => {
  expect(splitLines('a<br/>b<br>c<BR />d')).toEqual(['a', 'b', 'c', 'd'])
})

it('renders line breaks as <br>, never as markup', () => {
  const { container } = render(<p><Lines text="one<br/>two &amp; <b>three</b>" /></p>)
  expect(container.querySelectorAll('br')).toHaveLength(1)
  expect(container.querySelector('b')).toBeNull()
})

it('tidies climb text breaks: none at the ends, one blank line between paragraphs', () => {
  expect(tidyBreaks('<br/>One. <br/> <br/><br/>Two<br/>three<br/><br/><br/>')).toBe('One.<br/><br/>Two<br/>three')
  expect(tidyBreaks('<br/><br/>')).toBe('')
  expect(paragraphs('a<br/><br/>b<br/>c')).toEqual([['a'], ['b', 'c']])
})

it('splits a paragraph at a single break after a long finished sentence, not between short lines', () => {
  expect(sentenceParas(['Rap 45m from the top anchors to a stance on the left.', 'Great climbing up the crack.'])).toEqual([['Rap 45m from the top anchors to a stance on the left.'], ['Great climbing up the crack.']])
  expect(sentenceParas(['Joe.', '0400'])).toEqual([['Joe.', '0400']])
})
