import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import { SideNav } from './SideNav'

const node = (id: string, title: string, extra: Partial<IndexNode> = {}): IndexNode => ({ id, title, path: id, children: [], ...extra }) as IndexNode
const root = node('0', 'Guides', { path: '', children: [node('open', 'Open Crag'), node('secret', 'Secret Crag', { private: true })] })

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) => select({ location: { pathname: '/g' } }),
}))
vi.mock('#/guide/server', () => ({ fetchTree: async () => root, onTreeChange: () => () => {} }))
vi.mock('./RecentGuides', () => ({ RecentGuides: () => null }))

afterEach(cleanup)

it('marks private pages with a padlock, in the tree and in the filter results', async () => {
  render(<SideNav local={root} />)
  await act(async () => {})
  expect(screen.getAllByRole('img', { name: 'Private page' })).toHaveLength(1)
  expect(screen.getByText('Secret Crag').closest('div')?.querySelector('[aria-label="Private page"]')).toBeTruthy()
  expect(screen.getByText('Open Crag').closest('div')?.querySelector('[aria-label="Private page"]')).toBeNull()
  act(() => {
    const box = screen.getByPlaceholderText<HTMLInputElement>('Find a crag…')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(box, 'secret')
    box.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(screen.getAllByRole('img', { name: 'Private page' })).toHaveLength(1)
})
