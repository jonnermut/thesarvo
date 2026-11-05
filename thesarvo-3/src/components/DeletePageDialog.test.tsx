import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DeletePageDialog } from './DeletePageDialog'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
const deletePage = vi.fn()
const waitForGone = vi.fn()
vi.mock('#/guide/edit/deletePage', () => ({ deletePage: (...a: unknown[]) => deletePage(...a), waitForGone: (...a: unknown[]) => waitForGone(...a) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const page = { id: '84', title: 'Fossil Cove' }

it('says how many pages go with it', () => {
  render(<DeletePageDialog page={page} below={3} parentPath="south-east" onClose={() => {}} />)
  expect(screen.getByText('Delete Fossil Cove?')).toBeTruthy()
  expect(screen.getByText(/also deletes the 3 pages under it/)).toBeTruthy()
  cleanup()
  render(<DeletePageDialog page={page} below={0} parentPath="south-east" onClose={() => {}} />)
  expect(screen.queryByText(/pages under it/)).toBeNull()
})

it('deletes, waits for the page to leave the site, then goes to the page above', async () => {
  deletePage.mockResolvedValue({ ok: true, value: { ids: ['84'] } })
  waitForGone.mockResolvedValue(true)
  const onClose = vi.fn()
  render(<DeletePageDialog page={page} below={0} parentPath="south-east" onClose={onClose} />)
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog'))
  })
  expect(deletePage).toHaveBeenCalledWith('84')
  expect(waitForGone).toHaveBeenCalledWith('84')
  expect(onClose).toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith({ to: '/g/$', params: { _splat: 'south-east' } })
})

it('shows the server’s reason and stays when it cannot delete', async () => {
  deletePage.mockResolvedValue({ ok: false, message: 'Not allowed' })
  const onClose = vi.fn()
  render(<DeletePageDialog page={page} below={0} parentPath="" onClose={onClose} />)
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog'))
  })
  expect(screen.getByRole('alert').textContent).toBe('Not allowed')
  expect(navigate).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})
