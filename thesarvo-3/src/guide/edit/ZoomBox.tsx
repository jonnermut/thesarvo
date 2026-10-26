import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MOTION_MS } from '#/components/overlay'
import type { Size, View } from '#/guide/view/zoom'
import { clampView, fitView, panBy, scaleRange, zoomAt } from '#/guide/view/zoom'

/** Each zoom button press, as a factor. */
const STEP = 1.5
/** Further than this (px) and a press was a drag, so the click that ends it is not a tool click. */
const CLICK_SLOP = 5

type Pt = { x: number; y: number }
const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)

/**
 * The topo editor's photo, zoomable and pannable without getting in the way of drawing. Never wider
 * than the topo's own width or taller than most of the screen. Pinch, ⌘/Ctrl + scroll or the buttons
 * zoom; once zoomed in, scrolling pans. Two fingers, Space + drag or the middle button pan in any
 * tool, and with `panOnDrag` (the select tool) so does dragging the background. A press that moved
 * swallows its click, so panning never adds a point. `children` draws at the topo's own pixel size
 * and is told the screen pixels per topo pixel, to keep handles a steady size.
 */
export function ZoomBox({ width, height, panOnDrag, className = '', children }: { width: number; height: number; panOnDrag: boolean; className?: string; children: (scale: number) => React.ReactNode }) {
  const image = useMemo(() => ({ w: width, h: height }), [width, height])
  const box = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const view = useRef<View>({ s: 1, x: 0, y: 0 })
  const size = useRef<Size>({ w: 1, h: 1 })
  const [scale, setScale] = useState(1)
  const [zoomed, setZoomed] = useState(false)

  const apply = useCallback(
    (next: View, animate = false) => {
      view.current = next
      const el = layer.current
      if (!el) return
      el.style.transition = animate ? `transform ${MOTION_MS}ms ease-out` : 'none'
      el.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.s})`
      setScale(next.s)
      setZoomed(next.s > scaleRange(size.current, image)[0] * 1.001)
    },
    [image],
  )

  // Fits on first layout and when the box resizes, unless zoomed in, when the view is only kept in bounds.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    let first = true
    const measure = () => {
      const before = size.current
      size.current = { w: el.clientWidth, h: el.clientHeight }
      const atFit = first || view.current.s <= scaleRange(before, image)[0] * 1.001
      first = false
      apply(atFit ? fitView(size.current, image) : clampView(view.current, size.current, image))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [apply, image])

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const zoomBy = useCallback(
    (factor: number, at: Pt = { x: size.current.w / 2, y: size.current.h / 2 }, animate = true) =>
      apply(zoomAt(view.current, factor, at.x, at.y, size.current, image), animate),
    [apply, image],
  )
  const fit = () => apply(fitView(size.current, image), true)

  // Wheel listeners from React are passive and cannot keep the page still.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const lines = e.deltaMode === 1 ? 16 : 1
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomBy(Math.exp(-e.deltaY * lines * (e.ctrlKey ? 0.01 : 0.002)), local(e), false)
      } else if (view.current.s > scaleRange(size.current, image)[0] * 1.001) {
        e.preventDefault()
        apply(panBy(view.current, -e.deltaX * lines, -e.deltaY * lines, size.current, image))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [apply, image, zoomBy])

  // Space held over the photo turns any drag into a pan, as in drawing apps.
  const hovered = useRef(false)
  const [space, setSpace] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== ' ' || !hovered.current || typing(e.target)) return
      e.preventDefault()
      setSpace(true)
    }
    const up = (e: KeyboardEvent) => e.key === ' ' && setSpace(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const pointers = useRef(new Map<number, Pt>())
  /** Pointers moving the view rather than drawing. */
  const panning = useRef(new Set<number>())
  const moved = useRef(0)

  const startPan = (e: React.PointerEvent) => {
    panning.current.add(e.pointerId)
    box.current!.setPointerCapture(e.pointerId)
  }
  // Capture phase: a second finger or a pan press is taken before the tools under it see it.
  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (!pointers.current.size) moved.current = 0
    pointers.current.set(e.pointerId, local(e))
    if (space || e.button === 1 || (e.pointerType === 'touch' && pointers.current.size > 1)) {
      e.stopPropagation()
      e.preventDefault()
      moved.current = Infinity
      for (const id of pointers.current.keys()) if (e.pointerType === 'touch' || id === e.pointerId) panning.current.add(id)
      startPan(e)
    }
  }
  // Bubble phase: reaches here only when nothing under the press took it (handles stop it).
  const onPointerDown = (e: React.PointerEvent) => {
    if (panOnDrag && e.button === 0 && zoomed) startPan(e)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const at = local(e)
    pointers.current.set(e.pointerId, at)
    moved.current += dist(at, prev)
    if (!panning.current.has(e.pointerId)) return
    const other = [...pointers.current].find(([id]) => id !== e.pointerId && panning.current.has(id))?.[1]
    if (!other) return apply(panBy(view.current, at.x - prev.x, at.y - prev.y, size.current, image))
    const before = mid(prev, other)
    const after = mid(at, other)
    const zoomedIn = zoomAt(view.current, dist(at, other) / Math.max(1, dist(prev, other)), before.x, before.y, size.current, image)
    apply(panBy(zoomedIn, after.x - before.x, after.y - before.y, size.current, image))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    panning.current.delete(e.pointerId)
  }

  const btn = 'grid size-8 place-items-center rounded-md bg-black/55 text-white shadow hover:bg-black/75 disabled:opacity-40'
  const fitScale = scaleRange(size.current, image)[0]
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      // The topo's own width at most, and short enough to see whole beside the page.
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: `min(${width}px, ${(75 * width) / height}vh)` }}
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
    >
      <div
        ref={box}
        className={`absolute inset-0 touch-none select-none ${space ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (moved.current <= CLICK_SLOP) return
          e.stopPropagation()
          e.preventDefault()
        }}
        onDoubleClickCapture={(e) => moved.current > CLICK_SLOP && e.stopPropagation()}
      >
        <div ref={layer} className="absolute top-0 left-0 origin-top-left" style={{ width, height }}>
          {children(scale)}
        </div>
      </div>
      <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
        {zoomed && <span className="rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white tabular-nums">{Math.round((scale / fitScale) * 100)}%</span>}
        <button type="button" className={btn} onClick={() => zoomBy(1 / STEP)} disabled={!zoomed} aria-label="Zoom out" title="Zoom out (⌘/Ctrl + scroll)">
          <Icon d="M5 10h10" />
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(STEP)} aria-label="Zoom in" title="Zoom in (⌘/Ctrl + scroll)">
          <Icon d="M5 10h10M10 5v10" />
        </button>
        <button type="button" className={btn} onClick={fit} disabled={!zoomed} aria-label="Fit" title="Show the whole photo">
          <Icon d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
        </button>
      </div>
    </div>
  )
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d={d} />
  </svg>
)
