import { expect, it } from 'vitest'
import { linkFiles } from './files'

it('turns file names into links, and leaves a name without one', () => {
  const sign = (n: string) => (n === 'a & b.jpg' ? 'https://x/a?s=1&t=2' : null)
  expect(linkFiles('<p><img data-file="a &amp; b.jpg" alt=""><a data-file="a &amp; b.jpg">pic</a><img data-file="gone.jpg" alt=""></p>', sign)).toBe(
    '<p><img src="https://x/a?s=1&amp;t=2" loading="lazy" alt=""><a href="https://x/a?s=1&amp;t=2" target="_blank" rel="noopener">pic</a><img data-file="gone.jpg" alt=""></p>',
  )
})
