import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Climb, Header } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { credited, thecragContent, TopoCredit, withoutMark } from './credit'
import { HeaderBlock } from './HeaderBlock'

const climb: Climb = { type: 'climb', id: '7', name: 'Moss Monster', number: '1.', grade: '18', extra: '', length: '20m', stars: '', fa: '', text: 'Climb the arete.' }

describe('thecragContent', () => {
  it('lists what came from theCrag', () => {
    expect(thecragContent({ thecragContent: 'text, intro' })).toEqual(['text', 'intro'])
    expect(thecragContent(undefined)).toEqual([])
  })
  it('credits only a node with both the theCrag id and the mark', () => {
    expect(credited({ thecrag: '5', thecragContent: 'text' }, 'text')).toBe(true)
    expect(credited({ thecrag: '5' }, 'text')).toBe(false)
    expect(credited({ thecragContent: 'text' }, 'text')).toBe(false)
  })
  it('drops one mark, or all of them when it was the last', () => {
    expect(withoutMark({ thecrag: '5', thecragContent: 'text,intro' }, 'text')).toEqual({ thecrag: '5', thecragContent: 'intro' })
    expect(withoutMark({ thecrag: '5', thecragContent: 'text' }, 'text')).toEqual({ thecrag: '5' })
  })
})

describe('climb credit', () => {
  it('links the description to theCrag after the first ascent', () => {
    const { container } = render(<ClimbBlock climb={{ ...climb, fa: 'A. Climber, 2001', other: { thecrag: '500', thecragContent: 'text' } }} />)
    const link = container.querySelector('a[href="https://www.thecrag.com/node/500"]')
    expect(link).toHaveTextContent('theCrag')
    expect(link).toHaveAttribute('title', expect.stringContaining('CC BY-NC-SA 3.0'))
    expect(container.textContent).toContain('A. Climber, 2001 · From: theCrag')
  })
  it('shows no credit for a climb that was only matched', () => {
    const { container } = render(<ClimbBlock climb={{ ...climb, fa: 'A. Climber', other: { thecrag: '500' } }} />)
    expect(container.querySelector('a[href*="thecrag"]')).toBeNull()
    expect(container.textContent).not.toContain('From:')
  })
})

it('credits a topo and links the licence and the area', () => {
  const { container } = render(<TopoCredit other={{ thecrag: '900', thecragArea: '300', thecragContent: 'topo' }} />)
  expect(container.querySelector('a[href="https://www.thecrag.com/node/300"]')).not.toBeNull()
  expect(container.querySelector('a[href*="creativecommons.org/licenses/by-nc-sa"]')).not.toBeNull()
  expect(render(<TopoCredit other={{ thecrag: '900' }} />).container).toBeEmptyDOMElement()
})

it('credits only the header sections that came from theCrag', () => {
  const header: Header = { type: 'header', id: '1', name: 'Gloomy Wall', rock: '', sun: '', walk: '', access: 'Track on the left.', camping: '', acknowledgement: '', intro: 'Shady and steep.', history: '', autonumber: 'true', other: { thecrag: '300', thecragContent: 'intro' } }
  const stats = { total: 0 } as never
  const { container } = render(<HeaderBlock header={header} stats={stats} />)
  const sections = [...container.querySelectorAll('section')]
  expect(sections.find((s) => s.textContent?.includes('Shady'))?.querySelector('a[href*="thecrag"]')).not.toBeNull()
  expect(sections.find((s) => s.textContent?.includes('Track'))?.querySelector('a[href*="thecrag"]')).toBeNull()
})
