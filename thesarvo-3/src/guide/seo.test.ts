import { describe, expect, it } from 'vitest'
import type { Guide } from '#/guide/model/types'
import { excerpt, guideDescription, guideImage, pageDescription, pageHead } from './seo'

const header = { type: 'header', id: 'h', name: 'Lowdina', rock: 'Dolerite', sun: '', walk: '', access: 'Park at the gate.', camping: '', acknowledgement: '', intro: 'A steep<br/>dolerite crag.', history: '', autonumber: '' } as const
const guide = (nodes: Guide['nodes']): Guide => ({ id: '167', guideStars: '', nodes })

describe('excerpt', () => {
  it('strips tags, collapses space and cuts at a word with an ellipsis', () => {
    expect(excerpt('<p>One   two</p>&nbsp;three', 100)).toBe('One two three')
    expect(excerpt('alpha beta gamma delta', 12)).toBe('alpha beta…')
  })
  it('never cuts to nothing when the first word is long', () => {
    expect(excerpt('abcdefghijklmnopqrstuvwxyz', 10)).toHaveLength(10)
  })
})

describe('descriptions', () => {
  it('leads with size and rock, then the introduction', () => {
    expect(guideDescription(guide([header]), { title: 'Lowdina', count: 196 })).toBe('Lowdina climbing guide: 196 routes, Dolerite. A steep dolerite crag.')
  })
  it('falls back to access, and to the lead alone', () => {
    expect(guideDescription(guide([{ ...header, intro: '' }]), { title: 'Lowdina' })).toBe('Lowdina climbing guide: Dolerite. Park at the gate.')
    expect(guideDescription(guide([]), { title: 'Lowdina' })).toBe('Lowdina climbing guide.')
  })
  it('describes a contents page by its size, a prose page by its text', () => {
    expect(pageDescription({ title: 'Hobart', guides: 3, count: 50 }, null)).toBe('Hobart: 3 guides, 50 climbs.')
    expect(pageDescription({ title: 'Access' }, '<p>Respect the land.</p>')).toBe('Respect the land.')
  })
})

describe('pageHead', () => {
  it('carries description and card tags, and a summary card without a picture of the site’s own', () => {
    const head = pageHead({ title: 'Lowdina · thesarvo', description: 'A crag.', path: 'tasmania/lowdina' })
    expect(head.meta).toContainEqual({ name: 'description', content: 'A crag.' })
    expect(head.meta).toContainEqual({ property: 'og:title', content: 'Lowdina · thesarvo' })
    // No site address is set in tests, so nothing relative is sent as a card picture or canonical link.
    expect(head.links).toEqual([])
    expect(head.meta).toContainEqual({ name: 'twitter:card', content: 'summary' })
  })
  it('uses an absolute photo for the card', () => {
    const head = pageHead({ title: 't', description: 'd', path: 'x', image: 'https://img.example/a.jpg' })
    expect(head.meta).toContainEqual({ property: 'og:image', content: 'https://img.example/a.jpg' })
    expect(head.meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })
  it('picks the first topo photo of a guide', () => {
    expect(guideImage(guide([header]))).toBeUndefined()
    expect(guideImage(guide([header, { type: 'image', src: 'a.jpg' } as never]))).toContain('a.jpg')
  })
})
