import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AddPageDialog } from './AddPageDialog'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
const createPage = vi.fn()
vi.mock('#/guide/edit/createPage', () => ({ createPage: (...a: unknown[]) => createPage(...a), waitForPage: () => Promise.resolve('south-east/fossil-cove') }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const type = (name: string) => fireEvent.change(screen.getByPlaceholderText(/Fossil Cove/), { target: { value: name } })

it('offers a guide or a text page, and asks for a name', () => {
  render(<AddPageDialog parent="5" parentTitle="Sand River" onClose={() => {}} />)
  expect(screen.getByText('Add a page under Sand River')).toBeTruthy()
  expect(screen.getByRole<HTMLOptionElement>('option', { name: /^Page/ }).disabled).toBe(false)
  type('   ')
  fireEvent.submit(screen.getByRole('dialog'))
  expect(screen.getByRole('alert').textContent).toBe('Give the page a name')
  expect(createPage).not.toHaveBeenCalled()
})

it('creates the page, then opens it in the editor', async () => {
  createPage.mockResolvedValue({ ok: true, value: { id: '9000000002' } })
  const onClose = vi.fn()
  render(<AddPageDialog parent="5" parentTitle="Sand River" onClose={onClose} />)
  type('Fossil  Cove')
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog'))
  })
  expect(createPage).toHaveBeenCalledWith('5', 'Fossil Cove', 'guide')
  expect(onClose).toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith({ to: '/g/$', params: { _splat: 'south-east/fossil-cove' }, search: { edit: true } })
})

it('creates a text page when asked, and opens it in the editor', async () => {
  createPage.mockResolvedValue({ ok: true, value: { id: '9000000003' } })
  render(<AddPageDialog parent="5" parentTitle="Sand River" onClose={() => {}} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'html' } })
  type('Access notes')
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog'))
  })
  expect(createPage).toHaveBeenCalledWith('5', 'Access notes', 'html')
  expect(navigate).toHaveBeenCalledWith({ to: '/g/$', params: { _splat: 'south-east/fossil-cove' }, search: { edit: true } })
})

it('shows the server’s reason when it cannot add the page', async () => {
  createPage.mockResolvedValue({ ok: false, message: 'Offline' })
  render(<AddPageDialog parent="5" parentTitle="Sand River" onClose={() => {}} />)
  type('X')
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog'))
  })
  expect(screen.getByRole('alert').textContent).toBe('Offline')
  expect(navigate).not.toHaveBeenCalled()
})
