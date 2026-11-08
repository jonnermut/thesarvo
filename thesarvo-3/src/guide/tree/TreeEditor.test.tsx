import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import TreeEditor from './TreeEditor'

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
vi.mock('#/guide/server', () => ({ refreshManifest: vi.fn() }))
const api = vi.hoisted(() => ({ readTree: vi.fn(), movePage: vi.fn(), renamePage: vi.fn(), restoreTree: vi.fn(), sortPages: vi.fn() }))
vi.mock('./api', () => api)

const n = (id: string, title: string, children: StoredIndexNode[] = []): StoredIndexNode => ({ id, title, children })
const tree = () => n('1', 'Home', [n('2', 'South', [n('3', 'Fossil Cove'), n('5', 'Tessellated')]), n('4', 'North')])

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  api.readTree.mockResolvedValue({ ok: true, value: { index: tree(), moved: {} } })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('opens the tree at the page you came from, highlighted', async () => {
  render(<TreeEditor selected="3" />)
  await screen.findByText('Fossil Cove')
  expect(screen.getByText('Tessellated')).toBeTruthy()
  expect(screen.getByText('Fossil Cove').closest('[aria-current]')).toBeTruthy()
  expect(screen.getByText('Fossil Cove').parentElement?.textContent).toContain('/south/fossil-cove')
})

it('moves a page with the arrow buttons and undoes it with the tree the server handed back', async () => {
  api.movePage.mockResolvedValue({ ok: true, value: { before: tree() } })
  api.restoreTree.mockResolvedValue({ ok: true, value: { before: tree() } })
  render(<TreeEditor selected="5" />)
  await screen.findByText('Tessellated')
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Move up' })))
  expect(api.movePage).toHaveBeenCalledWith('5', '2', 0)
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: /Undo/ }).disabled).toBe(false))
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: /Undo/ })))
  expect(api.restoreTree).toHaveBeenCalledWith(tree())
  expect(screen.getByRole<HTMLButtonElement>('button', { name: /Undo/ }).disabled).toBe(true)
})

it('renames, and shows the new address', async () => {
  api.renamePage.mockResolvedValue({ ok: true, value: { before: tree() } })
  render(<TreeEditor selected="4" />)
  await screen.findByText('North')
  await act(async () => void fireEvent.click(screen.getAllByRole('button', { name: 'Rename North' })[0]))
  const box = screen.getByRole('textbox', { name: 'Rename North' })
  fireEvent.change(box, { target: { value: 'Northern Tasmania' } })
  await act(async () => void fireEvent.blur(box))
  expect(api.renamePage).toHaveBeenCalledWith('4', 'Northern Tasmania')
  expect(await screen.findByText('/northern-tasmania')).toBeTruthy()
})

it('shows what the server refused', async () => {
  api.movePage.mockResolvedValue({ ok: false, message: 'Cannot do that' })
  render(<TreeEditor selected="4" />)
  await screen.findByText('North')
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Move up' })))
  expect((await screen.findByRole('alert')).textContent).toBe('Cannot do that')
})

it('offers Sort A–Z only where the open page\'s children are out of order, and puts them in order', async () => {
  api.sortPages.mockResolvedValue({ ok: true, value: { before: tree() } })
  render(<TreeEditor selected="3" />)
  await screen.findByText('Fossil Cove')
  const buttons = screen.getAllByRole('button', { name: 'Sort A–Z' })
  expect(buttons).toHaveLength(1) // Home (South, North) is out of order; South (Fossil Cove, Tessellated) is not
  await act(async () => void fireEvent.click(buttons[0]))
  expect(api.sortPages).toHaveBeenCalledWith('1')
  expect(screen.queryByRole('button', { name: 'Sort A–Z' })).toBeNull()
})

it('shows a spinner and locks the tree until the change is saved', async () => {
  let done: (v: unknown) => void = () => undefined
  api.movePage.mockReturnValue(new Promise((r) => (done = r)))
  render(<TreeEditor selected="5" />)
  await screen.findByText('Tessellated')
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Move up' })))
  expect(screen.getByRole('status').textContent).toContain('Saving')
  expect(document.querySelector('ul[inert]')).toBeTruthy()
  await act(async () => done({ ok: true, value: { before: tree() } }))
  expect(screen.queryByRole('status')).toBeNull()
  expect(document.querySelector('ul[inert]')).toBeNull()
})
