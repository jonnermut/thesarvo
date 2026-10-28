import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LockMark } from './LockMark'

afterEach(cleanup)

it('is announced as a private page', () => {
  render(<LockMark />)
  expect(screen.getByRole('img', { name: 'Private page' })).toBeTruthy()
})
