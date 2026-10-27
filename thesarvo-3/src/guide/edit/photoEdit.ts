import type Pica from 'pica'

/** Longest edge kept when a photo is shrunk before upload; plenty for a topo on any screen. */
export const MAX_EDGE = 3200
/** Longest edge of the copy edited in the browser: iOS Safari refuses canvases over about 16.7 million pixels. */
const WORK_EDGE = 4096
/** Longest edge of the on-screen preview, small enough to redraw while a slider moves. */
const PREVIEW_EDGE = 1600
/** Light unsharp mask after shrinking, as pica suggests: brings back the crispness lost to downscaling. */
const SHARPEN = { unsharpAmount: 80, unsharpRadius: 0.6, unsharpThreshold: 2 }

type Size = { width: number; height: number }
type Source = CanvasImageSource & Size
/** Part of an image, as fractions of its width and height. */
export type Rect = { x: number; y: number; width: number; height: number }
export type Tone = { brightness: number; contrast: number; saturation: number }
/** Everything the photo editor does to a photo, whatever its resolution. */
export type PhotoEdit = { turns: number; tilt: number; crop: Rect; tone: Tone }

export const NO_TONE: Tone = { brightness: 1, contrast: 1, saturation: 1 }
export const WHOLE: Rect = { x: 0, y: 0, width: 1, height: 1 }
const rad = (degrees: number) => (degrees * Math.PI) / 180

/** `width` by `height` scaled down (never up) so the longest edge is at most `max`. */
export function fitEdge(width: number, height: number, max: number): Size {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * The photo turned by `turns` quarter turns clockwise and tilted by `tilt` degrees, trimmed to the largest rectangle of
 * its own shape that has no blank corners: what the crop is chosen from.
 */
export function straightSize(width: number, height: number, turns: number, tilt: number): Size {
  const [w, h] = turns % 2 ? [height, width] : [width, height]
  const [c, s] = [Math.abs(Math.cos(rad(tilt))), Math.abs(Math.sin(rad(tilt)))]
  const k = Math.min(w / (w * c + h * s), h / (w * s + h * c))
  return { width: w * k, height: h * k }
}

/** Where a point of the upright `width` by `height` photo lands in the edited one, as fractions of its size. */
export function editedPoint(width: number, height: number, edit: Pick<PhotoEdit, 'turns' | 'tilt' | 'crop'>, x: number, y: number) {
  const s = straightSize(width, height, edit.turns, edit.tilt)
  const a = rad(edit.turns * 90 + edit.tilt)
  const [dx, dy] = [x - width / 2, y - height / 2]
  const sx = (dx * Math.cos(a) - dy * Math.sin(a) + s.width / 2) / s.width
  const sy = (dx * Math.sin(a) + dy * Math.cos(a) + s.height / 2) / s.height
  return { x: (sx - edit.crop.x) / edit.crop.width, y: (sy - edit.crop.y) / edit.crop.height }
}

function canvas({ width, height }: Size) {
  const el = document.createElement('canvas')
  el.width = Math.max(1, Math.round(width))
  el.height = Math.max(1, Math.round(height))
  const ctx = el.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('This browser cannot edit images')
  ctx.imageSmoothingQuality = 'high'
  return [el, ctx] as const
}

/** The copy of a photo that is edited: no bigger than the browser can handle. */
export function workCopy(src: Source): HTMLCanvasElement {
  const size = fitEdge(src.width, src.height, WORK_EDGE)
  const [el, ctx] = canvas(size)
  ctx.drawImage(src, 0, 0, size.width, size.height)
  return el
}

/** `area` of the straightened photo (see straightSize), drawn with its longest edge at most `max`. */
function draw(src: Source, turns: number, tilt: number, area: Rect, max: number): HTMLCanvasElement {
  const s = straightSize(src.width, src.height, turns, tilt)
  const size = fitEdge(area.width * s.width, area.height * s.height, max)
  const [el, ctx] = canvas(size)
  const k = size.width / (area.width * s.width)
  ctx.scale(k, k)
  ctx.translate(s.width * (0.5 - area.x), s.height * (0.5 - area.y))
  ctx.rotate(rad(turns * 90 + tilt))
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return el
}

/** The turned and straightened photo, small enough to show and redraw quickly. */
export const preview = (src: Source, turns: number, tilt: number) => draw(src, turns, tilt, WHOLE, PREVIEW_EDGE)

/** The edited photo at full resolution, before tone and shrinking (see toJpeg). */
export const renderEdit = (src: Source, edit: PhotoEdit) => draw(src, edit.turns, edit.tilt, edit.crop, WORK_EDGE)

/** The CSS filter that previews `tone`; applyTone does the same to pixels. */
export const toneFilter = (t: Tone) => `contrast(${t.contrast}) brightness(${t.brightness}) saturate(${t.saturation})`

/** Applies `tone` to RGBA pixels in place, as the CSS filters do: contrast about mid-grey, then brightness, then saturation. */
export function applyTone(data: Uint8ClampedArray, t: Tone) {
  const s = t.saturation
  // CSS saturate() matrix; each row sums to 1, so the contrast offset passes through it unchanged.
  const m = [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ].map((row) => row.map((v) => v * t.brightness * t.contrast))
  const offset = t.brightness * 127.5 * (1 - t.contrast)
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    data[i] = m[0][0] * r + m[0][1] * g + m[0][2] * b + offset
    data[i + 1] = m[1][0] * r + m[1][1] * g + m[1][2] * b + offset
    data[i + 2] = m[2][0] * r + m[2][1] * g + m[2][2] * b + offset
  }
}

/**
 * Brightness and contrast that stretch the photo's tones to the full range, ignoring the darkest and lightest 0.5%:
 * lifts hazy, flat or dark photos. `data` is RGBA pixels (a sample is enough).
 */
export function autoTone(data: Uint8ClampedArray): Pick<Tone, 'brightness' | 'contrast'> {
  const counts = new Array<number>(256).fill(0)
  for (let i = 0; i < data.length; i += 4) counts[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++
  const level = (fraction: number) => {
    let seen = 0
    for (let v = 0; v < 256; v++) if ((seen += counts[v]) > fraction * (data.length / 4)) return v / 255
    return 1
  }
  const [lo, hi] = [Math.min(level(0.005), 0.45), Math.max(level(0.995), 0.55)]
  // Contrast c about 0.5, then brightness b, maps lo to 0 and hi to 1.
  const clamp = (n: number) => Math.round(Math.min(2, Math.max(0.5, n)) * 100) / 100
  return { contrast: clamp(1 / (1 - 2 * lo)), brightness: clamp((1 - 2 * lo) / (hi - lo)) }
}

const isNeutral = (t: Tone) => t.brightness === 1 && t.contrast === 1 && t.saturation === 1

let resizer: Promise<ReturnType<typeof Pica>> | undefined

/** Shrinks to the upload size with a high-quality filter (pica, loaded on first use), optionally sharpened and toned, as JPEG. */
export async function toJpeg(src: HTMLCanvasElement, sharpen: boolean, tone: Tone = NO_TONE): Promise<Blob> {
  resizer ??= import('pica').then(({ default: pica }) => pica())
  const [out, ctx] = canvas(fitEdge(src.width, src.height, MAX_EDGE))
  await (await resizer).resize(src, out, sharpen ? SHARPEN : {})
  if (!isNeutral(tone)) {
    const pixels = ctx.getImageData(0, 0, out.width, out.height)
    applyTone(pixels.data, tone)
    ctx.putImageData(pixels, 0, 0)
  }
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Could not convert the image')
  return blob
}

/** The photo's name with `.jpg` in place of its own extension. */
export const jpegName = (name: string) => name.replace(/\.\w+$/, '') + '.jpg'
