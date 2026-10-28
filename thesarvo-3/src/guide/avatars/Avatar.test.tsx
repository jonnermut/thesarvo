import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('#/auth/session', () => ({ useUser: () => null }))
afterEach(cleanup)

it('shows the picture the map names, and the initial for everyone else', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('uploaded') ? { ann: 'ann.1.jpg' } : { 'confluence:bob': 'bob.jpg', ann: 'old-ann.jpg' })))
  const { Avatar } = await import('./Avatar')
  const { container } = render(
    <>
      <Avatar ids={['confluence:bob']} name="Bob" />
      <Avatar ids={['confluence:cy']} name="Cy" />
      <Avatar ids={['ann']} name="Ann" />
    </>,
  )
  await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/g-data/avatars/bob.jpg'))
  expect(screen.getByText('C')).toBeTruthy()
  // An uploaded picture wins over an imported one.
  await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2))
  expect([...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['/g-data/avatars/bob.jpg', '/avatars/ann.1.jpg'])
})
