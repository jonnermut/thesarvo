import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { User } from '#/auth/session'
import { PageMenu } from './PageMenu'

const state = vi.hoisted(() => ({ user: null as User | null, trail: [{ path: 'south' }] as { path: string }[], search: {} }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a className={className}>{children}</a>,
  useNavigate: () => vi.fn(),
  useMatch: () => ({ params: { _splat: 'south/fossil-cove' }, search: state.search, loaderData: { guide: {}, trail: state.trail, node: { id: '84', title: 'Fossil Cove', path: 'south/fossil-cove', children: [{ id: '85', title: 'Wall', path: 'x', children: [] }] } } }),
}))
vi.mock('#/auth/session', () => ({ useUser: () => state.user, signIn: vi.fn() }))
vi.mock('#/guide/view/place', () => ({ rememberPlace: vi.fn() }))

const user: User = { sub: 'u', email: 'u@x.com', name: 'Una', hasPassword: true, admin: false }
afterEach(() => {
  cleanup()
  state.user = null
  state.trail = [{ path: 'south' }]
  state.search = {}
})
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Page menu' }))

it('offers Delete this page to admins only', () => {
  state.user = user
  render(<PageMenu />)
  open()
  expect(screen.queryByText('Delete this page')).toBeNull()
  cleanup()
  state.user = { ...user, admin: true }
  render(<PageMenu />)
  open()
  fireEvent.click(screen.getByText('Delete this page'))
  expect(screen.getByRole('dialog', { name: 'Delete this page' })).toBeTruthy()
  expect(screen.getByText(/also deletes the 1 page under it/)).toBeTruthy()
})

it('never offers it on the top of the tree or while editing', () => {
  state.user = { ...user, admin: true }
  state.trail = []
  render(<PageMenu />)
  open()
  expect(screen.queryByText('Delete this page')).toBeNull()
  cleanup()
  state.trail = [{ path: 'south' }]
  state.search = { edit: true }
  render(<PageMenu />)
  open()
  expect(screen.queryByText('Delete this page')).toBeNull()
})
