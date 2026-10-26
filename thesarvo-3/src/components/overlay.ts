import { useEffect, useState } from 'react'

/** How long panels take to slide or fade: short enough to feel instant. Matches `duration-180` in classes. */
export const MOTION_MS = 180

/**
 * Whether to render something that animates out: true while `open`, and for the exit transition
 * after. Enter transitions come from `starting:` classes, so only the exit needs this.
 */
export function usePresence(open: boolean, ms = MOTION_MS) {
  const [mounted, setMounted] = useState(open)
  // Adjusting state during render, so opening shows in the same paint.
  if (open && !mounted) setMounted(true)
  useEffect(() => {
    if (open) return
    const timer = setTimeout(() => setMounted(false), ms)
    return () => clearTimeout(timer)
  }, [open, ms])
  return open || mounted
}

let locks = 0

/**
 * Stops the page scrolling under an overlay: without this, touches that miss the overlay's own
 * scroller (or reach its end) scroll the page behind it, which on iPhones jumps about. Nested
 * overlays share one lock.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    if (locks++ === 0) {
      // Keep the width the scrollbar took, so the page does not shift sideways on desktop.
      root.style.setProperty('--scrollbar-width', `${window.innerWidth - root.clientWidth}px`)
      root.classList.add('scroll-locked')
    }
    return () => {
      if (--locks === 0) root.classList.remove('scroll-locked')
    }
  }, [active])
}

/** Calls `onClose` when Escape is pressed while `active`. */
export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onClose])
}

/** Turns on transitions for page-level layout changes (sidebar, width) just while one happens, not on load. */
export function animateLayout() {
  const root = document.documentElement
  root.classList.add('animate-layout')
  window.setTimeout(() => root.classList.remove('animate-layout'), MOTION_MS + 60)
}
