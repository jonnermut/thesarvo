import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from '#/auth/session'
import { ForumPage } from './ForumPage'

const session = vi.hoisted(() => ({ user: null as User | null }))
vi.mock('#/auth/session', () => ({ useUser: () => session.user }))
vi.mock('#/guide/avatars/Avatar', () => ({ Avatar: () => null }))
const api = vi.hoisted(() => ({ listThreads: vi.fn(), getThread: vi.fn(), post: vi.fn() }))
vi.mock('../client', () => api)

const user: User = { sub: 'u', email: 'u@x.com', name: 'Una', hasPassword: true, admin: false }
const meta = { id: 'n1', title: 'New routes', author: { sub: 'a', name: 'Ann' }, at: '2026-10-01T00:00:00Z', last: '2026-10-01T00:00:00Z', comments: 1 }
const thread = { ...meta, text: 'Two routes', comments: [{ id: 'c1', parent: null, author: { sub: 'b', name: 'Bob' }, at: '2026-10-02T00:00:00Z', text: 'Nice' }] }

afterEach(cleanup)
beforeEach(() => {
  session.user = null
  api.listThreads.mockResolvedValue({ ok: true, value: [meta] })
  api.getThread.mockResolvedValue({ ok: true, value: thread })
  api.post.mockReset()
})

it('is for signed-in people only', () => {
  render(<ForumPage go={() => {}} />)
  expect(screen.getByText(/signed-in members/)).toBeTruthy()
  expect(api.listThreads).not.toHaveBeenCalled()
})

it('lists posts and opens one', async () => {
  session.user = user
  const go = vi.fn()
  render(<ForumPage go={go} />)
  await act(async () => {})
  expect(screen.getByText(/Ann · .* · 1 comment/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'New routes' }))
  expect(go).toHaveBeenCalledWith('n1')
})

it('shows a post with its comments and sends a reply', async () => {
  session.user = user
  render(<ForumPage thread="n1" go={() => {}} />)
  await act(async () => {})
  expect(screen.getByText('Two routes')).toBeTruthy()
  expect(screen.getByText('Nice')).toBeTruthy()
  api.post.mockResolvedValue({ ok: true, value: { ...thread, comments: [...thread.comments, { id: 'c2', parent: null, author: { sub: 'u', name: 'Una' }, at: '2026-10-03T00:00:00Z', text: 'Agreed' }] } })
  fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Agreed' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Comment' })))
  expect(api.post).toHaveBeenCalledWith({ action: 'comment', thread: 'n1', parent: null, text: 'Agreed' })
  expect(screen.getByText('Agreed')).toBeTruthy()
})
