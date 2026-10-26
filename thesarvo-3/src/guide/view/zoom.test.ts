import { describe, expect, it } from 'vitest'
import { clampView, fitView, panBy, zoomAt } from './zoom'

const box = { w: 400, h: 800 }
const image = { w: 2000, h: 1000 }

describe('zoom', () => {
  it('fits the whole image, centred on the axis it does not fill', () => {
    expect(fitView(box, image)).toEqual({ s: 0.2, x: 0, y: 300 })
  })

  it('keeps the point under the fingers still while zooming', () => {
    const view = zoomAt(fitView(box, image), 2, 100, 400, box, image)
    expect(view.s).toBe(0.4)
    // Image point (500, 500) was at (100, 400) and still is.
    expect(view.x + 500 * view.s).toBeCloseTo(100)
    expect(view.y + 500 * view.s).toBeCloseTo(400)
  })

  it('never zooms out past the whole image or in past the limit', () => {
    expect(zoomAt(fitView(box, image), 0.1, 0, 0, box, image).s).toBe(0.2)
    expect(zoomAt(fitView(box, image), 100, 0, 0, box, image).s).toBe(1.5)
  })

  it('stops the edges coming inside the screen when panning', () => {
    const zoomed = clampView({ s: 1, x: 0, y: 0 }, box, image)
    expect(panBy(zoomed, 50, 0, box, image).x).toBe(0)
    expect(panBy(zoomed, -5000, 0, box, image).x).toBe(400 - 2000)
  })
})
