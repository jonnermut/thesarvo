import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WhatsNew } from './WhatsNew'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ params, search, hash, children }: { params: { _splat: string }; search: object; hash: string; children: React.ReactNode }) => (
    <a href={`/g/${params._splat}?${Object.keys(search)[0]}#${hash}`}>{children}</a>
  ),
}))
const fetchRecent = vi.fn()
vi.mock('#/guide/server', () => ({ fetchRecent: () => fetchRecent() }))

afterEach(cleanup)

it('lists the changes, each linking to its session in the history', async () => {
  fetchRecent.mockResolvedValue([
    { id: '1', path: 'south-east/sand-river', title: 'Sand River', session: 's1', name: 'Ann', at: '2026-10-03T01:00:00Z', description: 'edited the climb Albatros' },
    { id: '2', path: 'old', title: 'Old Crag', session: 's2', name: '', at: '2019-01-01T01:00:00Z', description: 'edited a text block' },
  ])
  render(<WhatsNew />)
  await act(async () => {})
  expect(screen.getByRole('link', { name: 'Sand River' }).getAttribute('href')).toBe('/g/south-east/sand-river?history#s1')
  expect(screen.getByText(/Ann edited the climb Albatros/)).toBeTruthy()
  expect(screen.getByText(/· edited a text block/)).toBeTruthy()
})

it('shows nothing when there is no feed', async () => {
  fetchRecent.mockRejectedValue(new Error('404'))
  const { container } = render(<WhatsNew />)
  await act(async () => {})
  expect(container.textContent).toBe('')
})
