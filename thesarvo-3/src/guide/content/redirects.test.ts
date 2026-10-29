import { expect, it } from 'vitest'
import { oldTitle, redirectEntries } from './redirects'
import type { IndexNode } from './types'

const node = (id: string, path: string, isGuide: boolean, children: IndexNode[] = []): IndexNode => ({ id, title: id, path, isGuide, children })

it('reads the title out of an old address', () => {
  expect(oldTitle('http://www.thesarvo.com/confluence/display/thesarvo/Apsley+Edge')).toBe('Apsley Edge')
  expect(oldTitle('https://www.thesarvo.com/confluence/display/thesarvo/Mt+Wellington+%26+Ridge')).toBe('Mt Wellington & Ridge')
  expect(oldTitle('https://www.thesarvo.com/confluence/pages/viewpage.action?pageId=5')).toBeNull()
})

it('maps titles and ids to the new addresses, and marks guides for attachments', () => {
  const root = node('414', '', false, [node('1', 'south-east', false, [node('2', 'south-east/apsley-edge', true)])])
  const urls = new Map([
    ['414', 'http://www.thesarvo.com/confluence/display/thesarvo/Climbing+Guides'],
    ['2', 'http://www.thesarvo.com/confluence/display/thesarvo/Apsley+Edge'],
  ])
  expect(redirectEntries(root, urls)).toEqual({
    'p:414': '/g/',
    't:thesarvo/climbing guides': '/g/',
    'p:1': '/g/south-east/',
    'p:2': '/g/south-east/apsley-edge/',
    'a:2': '1',
    't:thesarvo/apsley edge': '/g/south-east/apsley-edge/',
  })
})

it('sends the old Contact, Contribute, Copyright and privacy pages to their sections of About', () => {
  const root = node('414', '', false, [node('296', 'more/about-thesarvo-com', false)])
  const out = redirectEntries(root, new Map())
  expect(out['p:407']).toBe('/g/more/about-thesarvo-com/#contact')
  expect(out['t:thesarvo/contribute']).toBe('/g/more/about-thesarvo-com/#contributing')
  expect(out['p:398327814']).toBe('/g/more/about-thesarvo-com/#privacy')
  expect(redirectEntries(node('414', '', false), new Map())['p:407']).toBeUndefined()
})
