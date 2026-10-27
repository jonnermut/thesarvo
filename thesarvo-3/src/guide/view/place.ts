/**
 * Where the reader is, kept across switching between reading, editing and preview: the first block showing below
 * the bars at the top and how far below them its top was. The blocks carry `data-node` with their id in every view;
 * bars that stay on screen (the header, the editor's toolbar) carry `data-bar`.
 */
let pending: { id: string; below: number } | null = null

/** How long the place is held while photos load and the page settles, unless the reader scrolls first. */
const HOLD_MS = 2000

/** The bottom of the bars stuck to the top of the screen. */
const barsBottom = () => Math.max(0, ...[...document.querySelectorAll('[data-bar]')].map((b) => b.getBoundingClientRect().bottom))

/**
 * Scrolls a block to just below the bars and flashes it: for links to a climb where the page has no `c-` anchor for it,
 * as in the editor. Says whether the block was there.
 */
export function showNode(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)
  if (!el) return false
  window.scrollBy({ top: el.getBoundingClientRect().top - barsBottom() - 8, behavior: 'instant' })
  el.classList.remove('arrived')
  void el.offsetWidth
  el.classList.add('arrived')
  return true
}

/** Notes the block at the top of the screen, just before switching views. */
export function rememberPlace() {
  pending = null
  const bars = barsBottom()
  for (const el of document.querySelectorAll<HTMLElement>('[data-node]')) {
    const { top, bottom } = el.getBoundingClientRect()
    if (bottom <= bars || !el.dataset.node) continue
    // At the very top of the page there is nothing to keep, and the new view should start at its own top.
    if (window.scrollY > 0) pending = { id: el.dataset.node, below: top - bars }
    return
  }
}

/**
 * Once the new view has rendered: brings the noted block back to the same place below the bars. Photos loading
 * above it would push it down, so it is held there until the page settles or the reader scrolls. Only once.
 */
export function restorePlace() {
  const p = pending
  pending = null
  const el = p && document.querySelector(`[data-node="${CSS.escape(p.id)}"]`)
  if (!p || !el) return
  const align = () => window.scrollBy({ top: el.getBoundingClientRect().top - barsBottom() - p.below, behavior: 'instant' })
  align()
  const resized = new ResizeObserver(align)
  resized.observe(document.body)
  const stop = () => {
    resized.disconnect()
    clearTimeout(timer)
    for (const e of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.removeEventListener(e, stop)
  }
  const timer = setTimeout(stop, HOLD_MS)
  for (const e of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(e, stop, { passive: true })
}
