import { useEffect, useState } from 'react'

/**
 * Steps through `count` things every `seconds`, starting at a random one once the page is up (so the built page and the first render agree).
 * Holds still while the pointer or focus is on `hold`'s element, and for people who ask for less motion.
 */
export function useRotation(count: number, seconds: number) {
  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)
  useEffect(() => setAt(Math.floor(Math.random() * count)), [count])
  useEffect(() => {
    if (held || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setAt((a) => (a + 1) % count), seconds * 1000)
    return () => clearInterval(t)
  }, [held, count, seconds])
  const hold = { onMouseEnter: () => setHeld(true), onMouseLeave: () => setHeld(false), onFocus: () => setHeld(true), onBlur: () => setHeld(false) }
  return { at, hold, step: (by: number) => setAt((a) => (a + by + count) % count) }
}
