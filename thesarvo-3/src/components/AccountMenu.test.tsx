import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from '#/auth/session'
import { AccountMenu } from './AccountMenu'

const session = vi.hoisted(() => ({ user: null as User | null, signIn: vi.fn(async () => {}), signUp: vi.fn(async () => {}), signOut: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, role, onClick }: { to: string; children: React.ReactNode; role?: string; onClick?: () => void }) => (
    <a href={to} role={role} onClick={onClick}>
      {children}
    </a>
  ),
}))
vi.mock('#/auth/session', () => ({ useUser: () => session.user, signIn: session.signIn, signUp: session.signUp, signOut: session.signOut }))

afterEach(cleanup)
beforeEach(() => {
  session.user = null
  session.signIn.mockClear()
  session.signUp.mockClear()
})

it('gives a visitor one button, with sign in and create account inside it', () => {
  render(<AccountMenu />)
  expect(screen.queryByRole('menuitem')).toBeNull()
  act(() => screen.getByRole('button', { name: 'Account' }).click())
  act(() => screen.getByRole('menuitem', { name: /Create account/ }).click())
  expect(session.signUp).toHaveBeenCalledOnce()
  act(() => screen.getByRole('menuitem', { name: /Sign in/ }).click())
  expect(session.signIn).toHaveBeenCalledOnce()
})

it('shows a signed-in user’s initial and their name in the menu', () => {
  session.user = { sub: '1', email: 'jon@example.com', name: 'Jon', hasPassword: false, admin: false }
  render(<AccountMenu />)
  act(() => screen.getByRole('button', { name: 'Account: Jon' }).click())
  expect(screen.getByText('jon@example.com')).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Change your name' })).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeTruthy()
})

it('asks someone without a name to add one', () => {
  session.user = { sub: '1', email: 'jon@example.com', name: '', hasPassword: false, admin: false }
  render(<AccountMenu />)
  act(() => screen.getByRole('button', { name: 'Account: jon@example.com' }).click())
  expect(screen.getByRole('menuitem', { name: 'Add your name' }).getAttribute('href')).toBe('/account/name')
})
