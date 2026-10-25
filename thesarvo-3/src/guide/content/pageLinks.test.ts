import { describe, expect, it } from 'vitest'
import { pageFiles, resolvePageBody } from './pageLinks'
import type { IndexNode } from './types'

const node = (id: string, title: string, path: string, children: IndexNode[] = []): IndexNode => ({ id, title, path, isGuide: false, children })
const root = node('1', 'Climbing Guides', '', [node('2', 'Hobart', 'hobart-bouldering'), node('3', 'Bare Rock', 'bare-rock')])

describe('resolvePageBody', () => {
  it('links pages by title, matching tidied titles, and unlinks missing ones', () => {
    expect(resolvePageBody('<a data-page="Bare Rock">BR</a> <a data-page="Hobart bouldering">H</a> <a data-page="Gone">G <b>x</b></a>', root, '9')).toBe(
      '<a href="/g/bare-rock">BR</a> <a href="/g/hobart-bouldering">H</a> G <b>x</b>',
    )
  })

  it('turns attachment names into file URLs', () => {
    expect(resolvePageBody('<img data-file="a b.jpg" alt=""><a data-file="x.pdf">X</a>', root, '9')).toBe(
      '<img src="/g/content?f=9-a%20b.jpg" loading="lazy" alt=""><a href="/g/content?f=9-x.pdf">X</a>',
    )
  })

  it('lists the attachments a body uses', () => {
    expect(pageFiles('<img data-file="a &amp; b.jpg" alt=""><a data-page="X">X</a><a data-file="x.pdf">X</a>')).toEqual(['a & b.jpg', 'x.pdf'])
  })
})
