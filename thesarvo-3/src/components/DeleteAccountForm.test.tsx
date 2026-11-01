import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DeleteAccountForm } from './DeleteAccountForm'

const call = vi.fn()
const signOut = vi.fn()
vi.mock('#/auth/apiCall', () => ({ call: (...a: unknown[]) => call(...a) }))
vi.mock('#/auth/session', () => ({ signOut: () => signOut() }))
afterEach(() => { call.mockReset(); signOut.mockReset() })

it('asks first, then deletes and signs out', async () => {
  call.mockResolvedValue({ ok: true, value: {} })
  render(<DeleteAccountForm />)
  fireEvent.click(screen.getByText('Delete your account'))
  expect(call).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Delete my account'))
  await waitFor(() => expect(signOut).toHaveBeenCalled())
  expect(call).toHaveBeenCalledWith('delete-account', { method: 'POST', body: '{"confirm":"delete"}' })
})

it('shows the error and stays signed in when it fails', async () => {
  call.mockResolvedValue({ ok: false, message: 'Could not delete your account' })
  render(<DeleteAccountForm />)
  fireEvent.click(screen.getByText('Delete your account'))
  fireEvent.click(screen.getByText('Delete my account'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete')
  expect(signOut).not.toHaveBeenCalled()
})
