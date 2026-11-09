import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LONG_PRESS_MS, watchLongPress } from './longPress'

const touch = { pointerType: 'touch', clientX: 100, clientY: 100 }

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('fires after a still, held press', () => {
  const fire = vi.fn()
  watchLongPress(touch, fire)
  vi.advanceTimersByTime(LONG_PRESS_MS - 1)
  expect(fire).not.toHaveBeenCalled()
  vi.advanceTimersByTime(2)
  expect(fire).toHaveBeenCalledOnce()
})

it('does not fire when the finger lifts or wanders first', () => {
  const lifted = vi.fn()
  watchLongPress(touch, lifted)
  window.dispatchEvent(new Event('pointerup'))
  vi.advanceTimersByTime(LONG_PRESS_MS * 2)
  expect(lifted).not.toHaveBeenCalled()

  const wandered = vi.fn()
  watchLongPress(touch, wandered)
  window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 130, clientY: 100 }))
  vi.advanceTimersByTime(LONG_PRESS_MS * 2)
  expect(wandered).not.toHaveBeenCalled()
})

it('ignores a small wobble, and ignores the mouse', () => {
  const fire = vi.fn()
  watchLongPress(touch, fire)
  window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 104, clientY: 103 }))
  vi.advanceTimersByTime(LONG_PRESS_MS)
  expect(fire).toHaveBeenCalledOnce()

  const mouse = vi.fn()
  watchLongPress({ ...touch, pointerType: 'mouse' }, mouse)
  vi.advanceTimersByTime(LONG_PRESS_MS * 2)
  expect(mouse).not.toHaveBeenCalled()
})
