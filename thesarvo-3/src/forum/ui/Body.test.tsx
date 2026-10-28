import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { Body } from './Body'

afterEach(cleanup)

it('shows typed text as paragraphs, links addresses and never makes HTML of it', () => {
  const { container } = render(<Body text={'Hello <b>there</b>\n\nSee https://example.com/a?b=1, ok'} />)
  expect(container.querySelectorAll('p')).toHaveLength(2)
  expect(container.querySelector('b')).toBeNull()
  expect(container.textContent).toContain('<b>there</b>')
  const a = container.querySelector('a')
  expect(a?.getAttribute('href')).toBe('https://example.com/a?b=1')
  expect(a?.getAttribute('rel')).toContain('nofollow')
})

it('shows imported HTML as it is', () => {
  const { container } = render(<Body html="<p>Two <strong>new</strong> routes</p>" />)
  expect(container.querySelector('strong')?.textContent).toBe('new')
})
