import { useRef, useState } from 'react'

/** The gap a block dropped at `y` lands in: before the first block whose middle is below `y`, else after the last. */
export const dropGap = (blocks: { index: number; mid: number }[], y: number, count: number) =>
  blocks.find((b) => y < b.mid)?.index ?? count

/** Page edges that scroll while dragging: below the sticky header and toolbar, and the bottom of the screen. */
const SCROLL_TOP = 130
const SCROLL_BOTTOM = 60
const SCROLL_SPEED = 14

/**
 * Drag-to-reorder for the editor's blocks. Each block's wrapper carries `data-block={index}` inside the list;
 * `drag` is the block being moved and the gap it would land in, for drawing the drop line.
 */
export function useBlockDrag(count: number, onDrop: (id: string, to: number) => void) {
  const listRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; to: number } | null>(null)

  const start = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    let y = e.clientY
    let to = count
    const measure = () => {
      const blocks = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-block]') ?? [])].map((el) => {
        const r = el.getBoundingClientRect()
        return { index: Number(el.dataset.block), mid: r.top + r.height / 2 }
      })
      to = dropGap(blocks, y, count)
      setDrag({ id, to })
    }
    // Near the top or bottom of the screen the page scrolls, so long guides can be crossed in one drag.
    let frame = 0
    const scroll = () => {
      const by = y < SCROLL_TOP ? -SCROLL_SPEED : y > innerHeight - SCROLL_BOTTOM ? SCROLL_SPEED : 0
      if (by) {
        window.scrollBy(0, by)
        measure()
      }
      frame = requestAnimationFrame(scroll)
    }
    const move = (ev: PointerEvent) => {
      y = ev.clientY
      measure()
    }
    const end = (drop: boolean) => {
      cancelAnimationFrame(frame)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onCancel)
      handle.removeEventListener('lostpointercapture', onUp)
      window.removeEventListener('keydown', onKey)
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId)
      setDrag(null)
      if (drop) onDrop(id, to)
    }
    const onUp = () => end(true)
    const onCancel = () => end(false)
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && end(false)
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onCancel)
    // Capture can end without a pointerup reaching the grip (released outside the window, some remote and touch
    // input); the drag must still finish, or it stays stuck on screen.
    handle.addEventListener('lostpointercapture', onUp)
    window.addEventListener('keydown', onKey)
    measure()
    frame = requestAnimationFrame(scroll)
  }

  return { listRef, drag, start }
}

/** A grip to drag a block by; with focus, the arrow keys move it one place. */
export function DragHandle({ onPointerDown, onMove }: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void; onMove: (by: -1 | 1) => void }) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder (or use the arrow keys)"
      title="Drag to reorder"
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onMove(e.key === 'ArrowUp' ? -1 : 1)
      }}
      className="-my-1 -ml-1 grid h-7 w-6 cursor-grab touch-none place-items-center rounded text-muted hover:bg-black/5 hover:text-ink active:cursor-grabbing"
    >
      <svg viewBox="0 0 10 16" className="h-4 w-2.5" fill="currentColor" aria-hidden>
        {[2, 8, 14].flatMap((cy) => [2, 8].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" />))}
      </svg>
    </button>
  )
}
