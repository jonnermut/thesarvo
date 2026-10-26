import { useEffect, useState, useSyncExternalStore } from 'react'

const KEY = 'thesarvo.width'
/** The fixed width a guide uses (Tailwind's max-w-6xl); wider than this, full width is worth offering. */
const FIXED_PX = 1152
const listeners = new Set<() => void>()

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'full'
  } catch {
    return false
  }
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether guides fill the window (remembered in this browser); fixed on the server and first render. */
export const useFullWidth = () => useSyncExternalStore(subscribe, read, () => false)

function setFullWidth(full: boolean) {
  try {
    localStorage.setItem(KEY, full ? 'full' : 'fixed')
  } catch {
    /* storage unavailable: not remembered */
  }
  listeners.forEach((l) => l())
}

/** Switches guides between fixed and full width; shown only when the page is wide enough for it to matter. */
export function WidthToggle() {
  const full = useFullWidth()
  const [room, setRoom] = useState(false)
  // The main column narrows when the sidebar opens, so watch the page and measure it each time.
  useEffect(() => {
    const measure = () => setRoom((document.querySelector('main')?.clientWidth ?? 0) > FIXED_PX + 96)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    const aside = document.querySelector('aside')
    if (aside) observer.observe(aside)
    return () => observer.disconnect()
  }, [])
  if (!room) return null
  return (
    <button
      type="button"
      onClick={() => setFullWidth(!full)}
      aria-pressed={full}
      title={full ? 'Fixed width' : 'Full width'}
      aria-label="Full width"
      className="grid size-7 place-items-center rounded-md text-muted hover:bg-paper hover:text-link"
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* Arrows out to widen, in to narrow, between two edges. */}
        <path d="M2 4v12M18 4v12" />
        {full ? <path d="m5 7 3 3-3 3M15 7l-3 3 3 3" /> : <path d="M8 7 5 10l3 3M12 7l3 3-3 3M5 10h10" />}
      </svg>
    </button>
  )
}
