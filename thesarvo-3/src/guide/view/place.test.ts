import { afterEach, expect, it, vi } from 'vitest'
import { rememberPlace, restorePlace, showNode } from './place'

/** A header 56px tall, plus blocks at the given screen tops, each 100px tall. */
function blocks(tops: Record<string, number>, bar = 56) {
  document.body.innerHTML = `<header data-bar></header>${Object.keys(tops).map((id) => `<div data-node="${id}"></div>`).join('')}`
  const header = document.querySelector('header')
  if (header) header.getBoundingClientRect = () => DOMRect.fromRect({ y: 0, height: bar })
  for (const el of document.querySelectorAll<HTMLElement>('[data-node]')) {
    const top = tops[el.dataset.node ?? ''] ?? 0
    el.getBoundingClientRect = () => DOMRect.fromRect({ y: top, height: 100 })
  }
}

const scroll = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('brings the block at the top of the screen back to the same height in the new view', () => {
  scroll(2000)
  blocks({ a: -150, b: 30, c: 130 }) // a is gone above the header, b shows under it
  rememberPlace()
  blocks({ a: 400, b: 900, c: 1000 })
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  restorePlace()
  expect(by).toHaveBeenCalledWith({ top: 870, behavior: 'instant' })
  restorePlace() // only once
  expect(by).toHaveBeenCalledTimes(1)
})

it("keeps the block the same distance below taller bars, such as the editor's toolbar", () => {
  scroll(2000)
  blocks({ a: 70 })
  rememberPlace()
  blocks({ a: 900 }, 110)
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  restorePlace()
  expect(by).toHaveBeenCalledWith({ top: 900 - 110 - 14, behavior: 'instant' })
})

it('leaves the new view at its top when the reader was at the top', () => {
  scroll(0)
  blocks({ a: 80 })
  rememberPlace()
  blocks({ a: 500 })
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  restorePlace()
  expect(by).not.toHaveBeenCalled()
})

it('does nothing when the block is not in the new view', () => {
  scroll(500)
  blocks({ gone: 100 })
  rememberPlace()
  blocks({ other: 100 })
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  restorePlace()
  expect(by).not.toHaveBeenCalled()
})

it('holds the block in place while the page above it settles, until the reader scrolls', () => {
  let settle = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(fn: () => void) {
      settle = fn
    }
    observe() {}
    disconnect() {
      settle = () => {}
    }
  })
  scroll(2000)
  blocks({ a: 100 })
  rememberPlace()
  blocks({ a: 900 })
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  restorePlace()
  const a = document.querySelector('[data-node="a"]')
  if (a) a.getBoundingClientRect = () => DOMRect.fromRect({ y: 350, height: 100 }) // a photo above loaded
  settle()
  expect(by).toHaveBeenLastCalledWith({ top: 250, behavior: 'instant' })
  window.dispatchEvent(new Event('wheel'))
  settle()
  expect(by).toHaveBeenCalledTimes(2)
})

it('shows a block below the bars and flashes it, for pages without anchors', () => {
  scroll(0)
  blocks({ a: 100, b: 700 })
  const by = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  expect(showNode('b')).toBe(true)
  expect(by).toHaveBeenCalledWith({ top: 700 - 56 - 8, behavior: 'instant' })
  expect(document.querySelector('[data-node="b"]')?.classList.contains('arrived')).toBe(true)
  expect(showNode('missing')).toBe(false)
})
