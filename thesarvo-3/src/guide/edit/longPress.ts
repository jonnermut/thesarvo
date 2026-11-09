import { useSyncExternalStore } from 'react'

/** How long a finger must stay down, and how far it may wander (screen px), for a long press. */
export const LONG_PRESS_MS = 650
export const LONG_PRESS_SLOP = 10

/**
 * Starts watching a press that began at `start`; calls `fire` if it stays down and still for LONG_PRESS_MS.
 * Mice are left out: they have a Delete button and a key. Returns a cancel function (also run on release or movement).
 */
export function watchLongPress(e: { pointerType: string; clientX: number; clientY: number }, fire: () => void, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): () => void {
  if (e.pointerType === 'mouse') return () => {}
  const start = { x: e.clientX, y: e.clientY }
  const timer = setTimeout(() => {
    cancel()
    navigator.vibrate?.(30)
    fire()
  }, LONG_PRESS_MS)
  const move = (ev: PointerEvent) => Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > LONG_PRESS_SLOP && cancel()
  function cancel() {
    clearTimeout(timer)
    target.removeEventListener('pointermove', move as EventListener)
    target.removeEventListener('pointerup', cancel)
    target.removeEventListener('pointercancel', cancel)
  }
  target.addEventListener('pointermove', move as EventListener)
  target.addEventListener('pointerup', cancel)
  target.addEventListener('pointercancel', cancel)
  return cancel
}

const COARSE = '(pointer: coarse)'
const subscribe = (on: () => void) => {
  const m = window.matchMedia(COARSE)
  m.addEventListener('change', on)
  return () => m.removeEventListener('change', on)
}

/** True when the main pointer is a finger: handles are drawn bigger. */
export const useCoarsePointer = () => useSyncExternalStore(subscribe, () => window.matchMedia(COARSE).matches, () => false)
