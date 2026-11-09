import { useEffect, useState } from 'react'

/** How far the on-screen keyboard covers the bottom of the layout viewport (iOS keeps the layout viewport full height under it). */
export const keyboardInset = (layoutHeight: number, visual: { height: number; offsetTop: number }) => Math.max(0, Math.round(layoutHeight - visual.height - visual.offsetTop))

/** Offset for a bar stuck to the bottom of the screen, so it rides above the keyboard instead of hiding behind it. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(keyboardInset(window.innerHeight, vv))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}
