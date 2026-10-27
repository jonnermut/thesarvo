import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DragHandle, dropGap, useBlockDrag } from './BlockDrag'

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

function List({ onDrop }: { onDrop: (id: string, to: number) => void }) {
  const { listRef, drag, start } = useBlockDrag(2, onDrop)
  return (
    <div ref={listRef}>
      {drag && <p>dragging</p>}
      <section data-block={0}>
        <DragHandle onPointerDown={(e) => start(e, 'a')} onMove={() => {}} />
      </section>
    </div>
  )
}

it.each([
  ['pointerup', true],
  ['lostpointercapture', true],
  ['pointercancel', false],
] as const)('a drag always finishes: %s', (event, drops) => {
  const onDrop = vi.fn()
  render(<List onDrop={onDrop} />)
  const handle = screen.getByRole('button', { name: /reorder/ })
  Object.assign(handle, { setPointerCapture: () => {}, hasPointerCapture: () => false })
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
  expect(screen.queryByText('dragging')).not.toBeNull()
  fireEvent(handle, new Event(event))
  expect(screen.queryByText('dragging')).toBeNull()
  expect(onDrop).toHaveBeenCalledTimes(drops ? 1 : 0)
  // Nothing is left listening: a later pointerup does not drop again.
  fireEvent(handle, new Event('pointerup'))
  expect(onDrop).toHaveBeenCalledTimes(drops ? 1 : 0)
})

it('Escape cancels a drag', () => {
  const onDrop = vi.fn()
  render(<List onDrop={onDrop} />)
  const handle = screen.getByRole('button', { name: /reorder/ })
  Object.assign(handle, { setPointerCapture: () => {}, hasPointerCapture: () => false })
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByText('dragging')).toBeNull()
  expect(onDrop).not.toHaveBeenCalled()
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
