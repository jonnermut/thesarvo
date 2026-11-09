import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import { Breadcrumbs } from './Breadcrumbs'

const node = (id: string, title: string, path = id): IndexNode => ({ id, title, path, children: [], isGuide: false })

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

it('makes the page a crumb and the view the current entry when `then` is given', () => {
  render(<Breadcrumbs trail={[node('0', 'Guides', '')]} current={node('7', 'South Arm')} width="w" then="History" />)
  expect(screen.getByRole('link', { name: 'South Arm' }).getAttribute('href')).toBe('/g/7')
  expect(screen.getByText('History').getAttribute('aria-current')).toBe('page')
})

it('shows the page as the current entry without `then`, and nothing for a top-level page', () => {
  const { container, rerender } = render(<Breadcrumbs trail={[node('0', 'Guides', '')]} current={node('7', 'South Arm')} width="w" />)
  expect(screen.queryByRole('link', { name: 'South Arm' })).toBeNull()
  expect(screen.getByText('South Arm').getAttribute('aria-current')).toBe('page')
  rerender(<Breadcrumbs trail={[]} current={node('7', 'South Arm')} width="w" />)
  expect(container.querySelector('nav')).toBeNull()
})
