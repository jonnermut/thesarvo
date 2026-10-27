import { describe, expect, it } from 'vitest'
import { applyTone, autoTone, editedPoint, fitEdge, jpegName, NO_TONE, straightSize, WHOLE } from './photoEdit'

describe('photo editing maths', () => {
  it('shrinks to the longest edge, never enlarges', () => {
    expect(fitEdge(4032, 3024, 3200)).toEqual({ width: 3200, height: 2400 })
    expect(fitEdge(3024, 4032, 3200)).toEqual({ width: 2400, height: 3200 })
    expect(fitEdge(800, 600, 3200)).toEqual({ width: 800, height: 600 })
  })

  it('straightens to the largest rectangle of the photo’s shape with no blank corners', () => {
    expect(straightSize(400, 300, 0, 0)).toEqual({ width: 400, height: 300 })
    expect(straightSize(400, 300, 1, 0)).toEqual({ width: 300, height: 400 })
    const s = straightSize(400, 300, 0, 10)
    expect(s.width / s.height).toBeCloseTo(4 / 3)
    expect(s.width).toBeLessThan(400)
    // Its corners, turned back into the photo's own axes, lie on or inside the photo.
    const r = (10 * Math.PI) / 180
    for (const [x, y] of [[s.width / 2, s.height / 2], [-s.width / 2, s.height / 2]]) {
      expect(Math.abs(x * Math.cos(r) + y * Math.sin(r))).toBeLessThanOrEqual(200 + 1e-9)
      expect(Math.abs(-x * Math.sin(r) + y * Math.cos(r))).toBeLessThanOrEqual(150 + 1e-9)
    }
    // Tilting the other way trims the same.
    expect(straightSize(400, 300, 0, -10).width).toBeCloseTo(s.width)
  })

  it('follows a spot of the photo through turns, tilts and crops', () => {
    const none = { turns: 0, tilt: 0, crop: WHOLE }
    const near = (p: { x: number; y: number }, x: number, y: number) => {
      expect(p.x).toBeCloseTo(x)
      expect(p.y).toBeCloseTo(y)
    }
    near(editedPoint(400, 300, none, 100, 75), 0.25, 0.25)
    // A quarter turn clockwise takes the top left corner to the top right.
    near(editedPoint(400, 300, { ...none, turns: 1 }, 0, 0), 1, 0)
    near(editedPoint(400, 300, { ...none, turns: 3 }, 0, 0), 0, 1)
    near(editedPoint(400, 300, { ...none, turns: 2 }, 100, 75), 0.75, 0.75)
    // A tilt keeps the centre where it was.
    near(editedPoint(400, 300, { ...none, tilt: 7 }, 200, 150), 0.5, 0.5)
    // Cropping to the right half: the photo's centre is the crop's left edge.
    near(editedPoint(400, 300, { ...none, crop: { x: 0.5, y: 0, width: 0.5, height: 1 } }, 200, 150), 0, 0.5)
    near(editedPoint(400, 300, { ...none, crop: { x: 0.5, y: 0, width: 0.5, height: 1 } }, 300, 0), 0.5, 0)
  })

  it('adjusts tone as the CSS filters preview it', () => {
    const px = () => new Uint8ClampedArray([200, 100, 50, 255, 0, 0, 0, 255])
    const same = px()
    applyTone(same, NO_TONE)
    expect([...same]).toEqual([...px()])
    const brighter = px()
    applyTone(brighter, { ...NO_TONE, brightness: 1.2 })
    expect([...brighter.slice(0, 3)]).toEqual([240, 120, 60])
    const flat = px()
    applyTone(flat, { ...NO_TONE, contrast: 0 })
    expect([...flat]).toEqual([128, 128, 128, 255, 128, 128, 128, 255])
    const grey = px()
    applyTone(grey, { ...NO_TONE, saturation: 0 })
    expect(grey[0]).toBe(grey[1])
    expect(grey[1]).toBe(grey[2])
  })

  it('auto tone stretches a hazy photo to the full range', () => {
    // Greys from 64 to 191, as a dull, low-contrast photo.
    const data = new Uint8ClampedArray(128 * 4).map((_, i) => (i % 4 === 3 ? 255 : 64 + Math.floor(i / 4)))
    const tone = autoTone(data)
    expect(tone.contrast).toBeGreaterThan(1)
    applyTone(data, { ...NO_TONE, ...tone })
    expect(data[0]).toBeLessThan(8)
    expect(data[data.length - 2]).toBeGreaterThan(245)
  })

  it('names the result as JPEG', () => {
    expect(jpegName('IMG_0001.HEIC')).toBe('IMG_0001.jpg')
    expect(jpegName('crag.png')).toBe('crag.jpg')
  })
})
