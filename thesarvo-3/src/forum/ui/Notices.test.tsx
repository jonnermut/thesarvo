import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Notices } from './Notices'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ search, children }: { search: { thread?: string }; children: React.ReactNode }) => <a href={`/g/forum?thread=${search.thread}`}>{children}</a>,
}))
const list = vi.fn()
vi.mock('../client', () => ({ notices: () => list() }))
afterEach(cleanup)

const notice = (id: string, until: string) => ({ id, title: `Title ${id}`, text: `Text ${id}`, author: { sub: 'a', name: 'Ann' }, at: '2026-01-01T00:00:00Z', until })

it('shows the title and text of each live notice, with a link to the post', async () => {
  list.mockResolvedValue([notice('n1', '2999-01-01T00:00:00Z'), notice('n2', '2000-01-01T00:00:00Z')])
  render(<Notices />)
  await act(async () => {})
  expect(screen.getByText('Title n1')).toBeTruthy()
  expect(screen.getByText('Text n1')).toBeTruthy()
  expect(screen.queryByText('Title n2')).toBeNull()
  expect(screen.getByRole('link').getAttribute('href')).toBe('/g/forum?thread=n1')
})

it('shows nothing without notices', async () => {
  list.mockResolvedValue([])
  const { container } = render(<Notices />)
  await act(async () => {})
  expect(container.textContent).toBe('')
})

it('cuts a long notice short until Read more is pressed', async () => {
  const height = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
  list.mockResolvedValue([notice('n1', '2999-01-01T00:00:00Z')])
  render(<Notices />)
  await act(async () => {})
  const more = screen.getByRole('button', { name: 'Read more' })
  expect(more.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(more)
  expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true')
  height.mockRestore()
})

it('has no Read more for a short notice', async () => {
  list.mockResolvedValue([notice('n1', '2999-01-01T00:00:00Z')])
  render(<Notices />)
  await act(async () => {})
  expect(screen.queryByRole('button')).toBeNull()
})
