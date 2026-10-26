import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOTION_MS, useEscape, usePresence, useScrollLock } from '#/components/overlay'
import type { Size, View } from './zoom'
import { clampView, fitView, panBy, scaleRange, zoomAt } from './zoom'

/** Each zoom button press, as a factor. */
const STEP = 1.5
/** A second tap this soon and this close (px) after the first is a double tap. */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_PX = 30
/** Further than this (px) and a press was a drag, not a tap, so it does not open a route. */
const TAP_SLOP = 8

type Point = { x: number; y: number }
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Full-screen topo that opens with the whole photo filling the screen. Drag to pan, pinch, scroll
 * or the buttons to zoom about the fingers, cursor or centre, double-tap to zoom in or back out.
 * `children` draws the photo at its own pixel size; it is told how wide it is on screen, so its
 * markers can stay legible.
 */
export function TopoViewer({ width, height, open, onClose, children }: { width: number; height: number; open: boolean; onClose: () => void; children: (shownWidth: number) => React.ReactNode }) {
  const mounted = usePresence(open)
  useScrollLock(open)
  useEscape(open, onClose)
  if (!mounted) return null
  // Portalled: the figure is a size container, which would otherwise become the containing block of `fixed`.
  return createPortal(
    <div
      role="dialog"
      aria-label="Topo"
      className={`fixed inset-0 z-50 bg-black/95 transition-opacity duration-180 starting:opacity-0 ${open ? '' : 'pointer-events-none opacity-0'}`}
    >
      <Surface width={width} height={height} onClose={onClose}>
        {children}
      </Surface>
    </div>,
    document.body,
  )
}

function Surface({ width, height, onClose, children }: { width: number; height: number; onClose: () => void; children: (shownWidth: number) => React.ReactNode }) {
  const image = useMemo(() => ({ w: width, h: height }), [width, height])
  const box = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const view = useRef<View>({ s: 1, x: 0, y: 0 })
  const size = useRef<Size>({ w: 1, h: 1 })
  // Rounded so a pinch re-renders the routes now and then, not every frame.
  const [shownWidth, setShownWidth] = useState(0)

  const apply = useCallback(
    (next: View, animate = false) => {
      view.current = next
      const el = layer.current
      if (!el) return
      el.style.transition = animate ? `transform ${MOTION_MS}ms ease-out` : 'none'
      el.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.s})`
      setShownWidth(Math.round((next.s * image.w) / 50) * 50)
    },
    [image],
  )

  // Fit on opening and when the screen turns, unless zoomed in, when the view is only kept in bounds.
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

  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const zoomBy = useCallback(
    (factor: number, at: Point = { x: size.current.w / 2, y: size.current.h / 2 }, animate = true) =>
      apply(zoomAt(view.current, factor, at.x, at.y, size.current, image), animate),
    [apply, image],
  )
  const fit = useCallback(() => apply(fitView(size.current, image), true), [apply, image])

  // Wheel and trackpad pinch zoom about the cursor; React's wheel listener is passive, so it cannot stop the page.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const lines = e.deltaMode === 1 ? 16 : 1
      zoomBy(Math.exp(-e.deltaY * lines * (e.ctrlKey ? 0.01 : 0.002)), local(e), false)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const pan = (dx: number, dy: number) => apply(panBy(view.current, dx, dy, size.current, image), true)
      const actions: Record<string, () => void> = {
        '+': () => zoomBy(STEP),
        '=': () => zoomBy(STEP),
        '-': () => zoomBy(1 / STEP),
        '0': fit,
        ArrowLeft: () => pan(80, 0),
        ArrowRight: () => pan(-80, 0),
        ArrowUp: () => pan(0, 80),
        ArrowDown: () => pan(0, -80),
      }
      if (!actions[e.key]) return
      e.preventDefault()
      actions[e.key]()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apply, fit, image, zoomBy])

  // One finger pans, two pinch. Touch pointers stay with the element they began on, so these bubble here.
  const pointers = useRef(new Map<number, Point>())
  const moved = useRef(0)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!pointers.current.size) moved.current = 0
    pointers.current.set(e.pointerId, local(e))
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const at = local(e)
    const other = [...pointers.current].find(([id]) => id !== e.pointerId)?.[1]
    pointers.current.set(e.pointerId, at)
    if (!other) {
      moved.current += dist(at, prev)
      apply(panBy(view.current, at.x - prev.x, at.y - prev.y, size.current, image))
      return
    }
    moved.current = Infinity // a pinch is never a tap
    const before = mid(prev, other)
    const after = mid(at, other)
    const zoomed = zoomAt(view.current, dist(at, other) / Math.max(1, dist(prev, other)), before.x, before.y, size.current, image)
    apply(panBy(zoomed, after.x - before.x, after.y - before.y, size.current, image))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId) || pointers.current.size || moved.current > TAP_SLOP) return
    const at = local(e)
    const last = lastTap.current
    if (e.timeStamp - last.t < DOUBLE_TAP_MS && dist(at, last) < DOUBLE_TAP_PX) {
      lastTap.current = { t: 0, x: 0, y: 0 }
      // In to three times the whole-photo size at the tap, or back out.
      const [min] = scaleRange(size.current, image)
      if (view.current.s < min * 1.5) zoomBy((min * 3) / view.current.s, at)
      else fit()
    } else lastTap.current = { t: e.timeStamp, ...at }
  }

  const btn = 'grid size-10 place-items-center rounded-full bg-black/60 text-white shadow hover:bg-black/80'
  return (
    <>
      <div
        ref={box}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => e.pointerType === 'mouse' && pointers.current.delete(e.pointerId)}
        onDragStart={(e) => e.preventDefault()}
        // A drag ends with a click on whatever is under the finger: not a route tap.
        onClickCapture={(e) => {
          if (moved.current <= TAP_SLOP) return
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        <div ref={layer} className="@container absolute top-0 left-0 origin-top-left" style={{ width: image.w, height: image.h }}>
          {children(shownWidth)}
        </div>
      </div>
      <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 flex gap-2">
        <button type="button" className={btn} onClick={() => zoomBy(1 / STEP)} aria-label="Zoom out">
          <Icon d="M5 10h10" />
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(STEP)} aria-label="Zoom in">
          <Icon d="M5 10h10M10 5v10" />
        </button>
        <button type="button" className={btn} onClick={fit} aria-label="Fit to screen">
          <Icon d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
        </button>
        <button type="button" className={btn} onClick={onClose} aria-label="Close">
          <Icon d="m5 5 10 10M15 5 5 15" />
        </button>
      </div>
    </>
  )
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}
