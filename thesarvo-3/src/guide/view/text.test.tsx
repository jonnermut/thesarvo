import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Lines, splitLines } from './text'

it('splits on <br/> in any common spelling', () => {
  expect(splitLines('a<br/>b<br>c<BR />d')).toEqual(['a', 'b', 'c', 'd'])
})

it('renders line breaks as <br>, never as markup', () => {
  const { container } = render(<p><Lines text="one<br/>two &amp; <b>three</b>" /></p>)
  expect(container.querySelectorAll('br')).toHaveLength(1)
  expect(container.querySelector('b')).toBeNull()
})
