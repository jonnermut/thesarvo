import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from './session'
import { RequireSignIn } from './RequireSignIn'

const session = vi.hoisted(() => ({ user: null as User | null, signIn: vi.fn(async () => {}) }))
vi.mock('./session', () => ({ useUser: () => session.user, signIn: session.signIn }))

const jon: User = { sub: '1', email: 'a@b.c', name: 'A', hasPassword: true }
const page = () => render(<RequireSignIn what="edit this guide"><p>Editor</p></RequireSignIn>)

afterEach(cleanup)
beforeEach(() => {
  session.user = null
  session.signIn.mockClear()
})

it('sends a signed-out visitor straight to sign in', () => {
  page()
  expect(session.signIn).toHaveBeenCalledOnce()
  expect(screen.queryByText('Editor')).toBeNull()
  expect(screen.getByText('Sign in to edit this guide.')).toBeTruthy()
})

it('shows the page to a signed-in user without signing in again', () => {
  session.user = jon
  page()
  expect(screen.getByText('Editor')).toBeTruthy()
  expect(session.signIn).not.toHaveBeenCalled()
})

it('after signing out here, offers a button rather than leaving at once', () => {
  session.user = jon
  const { rerender } = page()
  session.user = null
  rerender(<RequireSignIn what="edit this guide"><p>Editor</p></RequireSignIn>)
  expect(session.signIn).not.toHaveBeenCalled()
  act(() => screen.getByRole('button', { name: 'Sign in' }).click())
  expect(session.signIn).toHaveBeenCalledOnce()
})
