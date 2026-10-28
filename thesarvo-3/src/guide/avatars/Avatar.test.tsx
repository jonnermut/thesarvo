import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('#/auth/session', () => ({ useUser: () => null }))
afterEach(cleanup)

it('shows the picture the map names, and the initial for everyone else', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ 'confluence:bob': 'bob.jpg' })))
  const { Avatar } = await import('./Avatar')
  const { container } = render(
    <>
      <Avatar ids={['confluence:bob']} name="Bob" />
      <Avatar ids={['confluence:ann']} name="Ann" />
    </>,
  )
  await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/g-data/avatars/bob.jpg'))
  expect(screen.getByText('A')).toBeTruthy()
  expect(container.querySelectorAll('img')).toHaveLength(1)
})
