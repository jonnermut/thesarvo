import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DragHandle, dropGap } from './BlockDrag'

afterEach(cleanup)

const blocks = [
  { index: 0, mid: 100 },
  { index: 1, mid: 300 },
  { index: 3, mid: 500 }, // index 2 is a block the editor does not show
]

it('drops into the gap before the first block whose middle is below the pointer', () => {
  expect(dropGap(blocks, 50, 4)).toBe(0)
  expect(dropGap(blocks, 150, 4)).toBe(1)
  expect(dropGap(blocks, 450, 4)).toBe(3)
  expect(dropGap(blocks, 900, 4)).toBe(4)
})

it('moves a block one place with the arrow keys', () => {
  const onMove = vi.fn()
  render(<DragHandle onPointerDown={() => {}} onMove={onMove} />)
  const handle = screen.getByRole('button', { name: /reorder/ })
  fireEvent.keyDown(handle, { key: 'ArrowUp' })
  fireEvent.keyDown(handle, { key: 'ArrowDown' })
  fireEvent.keyDown(handle, { key: 'Enter' })
  expect(onMove.mock.calls).toEqual([[-1], [1]])
})
