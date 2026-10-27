import { describe, expect, it } from 'vitest'
import { coverZoom, fitEdge, jpegName, rotatedBox } from './photoEdit'

describe('photo editing maths', () => {
  it('shrinks to the longest edge, never enlarges', () => {
    expect(fitEdge(4032, 3024, 3200)).toEqual({ width: 3200, height: 2400 })
    expect(fitEdge(3024, 4032, 3200)).toEqual({ width: 2400, height: 3200 })
    expect(fitEdge(800, 600, 3200)).toEqual({ width: 800, height: 600 })
  })

  it('measures the box a tilted photo fills', () => {
    expect(rotatedBox(400, 300, 0)).toEqual({ width: 400, height: 300 })
    const box = rotatedBox(400, 300, 90)
    expect(box.width).toBeCloseTo(300)
    expect(box.height).toBeCloseTo(400)
  })

  it('zooms a straightened photo just enough to leave no blank corners', () => {
    expect(coverZoom(400, 300, 0, 4 / 3)).toBe(1)
    expect(coverZoom(400, 300, 0, 1)).toBe(1)
    // Tilted, the zoom grows with the angle, the same either way.
    const five = coverZoom(400, 300, 5, 4 / 3)
    expect(five).toBeGreaterThan(1)
    expect(coverZoom(400, 300, 10, 4 / 3)).toBeGreaterThan(five)
    expect(coverZoom(400, 300, -5, 4 / 3)).toBeCloseTo(five)
  })

  it('checks no corner of the crop falls off the tilted photo', () => {
    const [w, h, deg, aspect] = [400, 300, 12, 3 / 4]
    const box = rotatedBox(w, h, deg)
    const z = coverZoom(w, h, deg, aspect)
    const [cw, ch] = box.width > box.height * aspect ? [box.height * aspect, box.height] : [box.width, box.width / aspect]
    // Corners of the crop (centred), turned into the photo's own axes, must lie inside the zoomed photo.
    const r = (deg * Math.PI) / 180
    for (const [x, y] of [[cw / 2, ch / 2], [-cw / 2, ch / 2]]) {
      const u = x * Math.cos(r) + y * Math.sin(r)
      const v = -x * Math.sin(r) + y * Math.cos(r)
      expect(Math.abs(u)).toBeLessThanOrEqual((w * z) / 2 + 1e-9)
      expect(Math.abs(v)).toBeLessThanOrEqual((h * z) / 2 + 1e-9)
    }
  })

  it('names the result as JPEG', () => {
    expect(jpegName('IMG_0001.HEIC')).toBe('IMG_0001.jpg')
    expect(jpegName('crag.png')).toBe('crag.jpg')
  })
})
