import { expect, it } from 'vitest'
import type { Thread } from './types'
import { linkFiles, unlinkFiles, withFileLinks } from './files'

it('turns file names into links, and leaves a name without one', () => {
  const sign = (n: string) => (n === 'a & b.jpg' ? 'https://x/a?s=1&t=2' : null)
  expect(linkFiles('<p><img data-file="a &amp; b.jpg" alt=""><a data-file="a &amp; b.jpg">pic</a><img data-file="gone.jpg" alt=""></p>', sign)).toBe(
    '<p><img src="https://x/a?s=1&amp;t=2" loading="lazy" alt=""><a href="https://x/a?s=1&amp;t=2" target="_blank" rel="noopener">pic</a><img data-file="gone.jpg" alt=""></p>',
  )
})

it('turns a signed picture link back into its file name before saving', () => {
  const html = '<p><img src="https://b.s3.ap-southeast-2.amazonaws.com/private/forum-images/n1abc/a%20b.jpg?X-Amz-Signature=1&amp;X-Amz-Date=2" loading="lazy" alt=""><img src="https://other.example/x.jpg" alt=""></p>'
  expect(unlinkFiles(html)).toBe('<p><img data-file="a b.jpg" alt=""><img src="https://other.example/x.jpg" alt=""></p>')
})

it('links development pictures to the local files, and unlinks them again', () => {
  const t = { id: 'n1abc', html: '<p><img data-file="a b.jpg" alt=""></p>', comments: [{ html: '<p><img data-file="c.png" alt=""></p>' }] } as unknown as Thread
  const linked = withFileLinks(t, { NODE_ENV: 'development' })
  expect(linked.html).toBe('<p><img src="/.saves/private/forum-images/n1abc/a%20b.jpg?dev=1" loading="lazy" alt=""></p>')
  expect(unlinkFiles(linked.html ?? '')).toBe(t.html)
  expect(withFileLinks(t, { NODE_ENV: 'production' })).toBe(t)
})
