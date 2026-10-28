import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ForumFeed } from './ForumFeed'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ search, children }: { search: { thread?: string }; children: React.ReactNode }) => <a href={`/g/forum${search.thread ? `?thread=${search.thread}` : ''}`}>{children}</a>,
}))
const recent = vi.fn()
vi.mock('../client', () => ({ recentThreads: () => recent() }))
afterEach(cleanup)

it('lists recent posts with their comment counts', async () => {
  recent.mockResolvedValue([
    { id: 'n1', title: 'New routes', author: { sub: 'a', name: 'Ann' }, at: '2026-10-01T00:00:00Z', last: '2026-10-02T00:00:00Z', comments: 3 },
    { id: 'n2', title: 'Lost phone', author: { sub: 'b', name: 'Bob' }, at: '2026-09-01T00:00:00Z', last: '2026-09-01T00:00:00Z', comments: 1 },
  ])
  render(<ForumFeed />)
  await act(async () => {})
  expect(screen.getByRole('link', { name: 'New routes' }).getAttribute('href')).toBe('/g/forum?thread=n1')
  expect(screen.getByText(/Ann · .* · 3 comments/)).toBeTruthy()
  expect(screen.getByText(/Bob · .* · 1 comment$/)).toBeTruthy()
})

it('shows nothing without posts', async () => {
  recent.mockResolvedValue([])
  const { container } = render(<ForumFeed />)
  await act(async () => {})
  expect(container.textContent).toBe('')
})
