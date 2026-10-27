import type Pica from 'pica'
import type { Area } from 'react-easy-crop'

/** Longest edge kept when a photo is shrunk before upload; plenty for a topo on any screen. */
export const MAX_EDGE = 3200
/** Longest edge of the copy edited in the browser: iOS Safari refuses canvases over about 16.7 million pixels. */
const WORK_EDGE = 4096
/** Light unsharp mask after shrinking, as pica suggests: brings back the crispness lost to downscaling. */
const SHARPEN = { unsharpAmount: 80, unsharpRadius: 0.6, unsharpThreshold: 2 }

type Size = { width: number; height: number }
type Source = CanvasImageSource & Size

/** `width` by `height` scaled down (never up) so the longest edge is at most `max`. */
export function fitEdge(width: number, height: number, max: number): Size {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** The box a `width` by `height` image fills once tilted by `degrees`. */
export function rotatedBox(width: number, height: number, degrees: number): Size {
  const r = (Math.abs(degrees) * Math.PI) / 180
  const [c, s] = [Math.abs(Math.cos(r)), Math.abs(Math.sin(r))]
  return { width: width * c + height * s, height: width * s + height * c }
}

/**
 * The least zoom at which a photo tilted by `degrees` still covers the whole crop, so a straightened photo has no
 * blank corners. The crop is sized as react-easy-crop sizes it: the largest of its `aspect` inside the tilted box.
 */
export function coverZoom(width: number, height: number, degrees: number, aspect: number): number {
  const box = rotatedBox(width, height, degrees)
  const [cw, ch] = box.width > box.height * aspect ? [box.height * aspect, box.height] : [box.width, box.width / aspect]
  const r = (Math.abs(degrees) * Math.PI) / 180
  const [c, s] = [Math.cos(r), Math.sin(r)]
  return Math.max(1, (cw * c + ch * s) / width, (cw * s + ch * c) / height)
}

function canvas({ width, height }: Size) {
  const el = document.createElement('canvas')
  el.width = Math.max(1, Math.round(width))
  el.height = Math.max(1, Math.round(height))
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('This browser cannot edit images')
  return [el, ctx] as const
}

/** A copy of `src` turned clockwise by `turns` quarter turns, no bigger than the editing limit. */
export function quarterTurn(src: Source, turns: number): HTMLCanvasElement {
  const size = fitEdge(src.width, src.height, WORK_EDGE)
  const sideways = turns % 2 !== 0
  const [el, ctx] = canvas(sideways ? { width: size.height, height: size.width } : size)
  ctx.translate(el.width / 2, el.height / 2)
  ctx.rotate((turns * Math.PI) / 2)
  ctx.drawImage(src, -size.width / 2, -size.height / 2, size.width, size.height)
  return el
}

/**
 * The cropped part of `src` tilted by `degrees`. `area` is in pixels of the tilted box, as react-easy-crop reports it;
 * only the crop is drawn, so a tilted photo never needs a canvas bigger than the result.
 */
export function renderCrop(src: Source, degrees: number, area: Area): HTMLCanvasElement {
  const box = rotatedBox(src.width, src.height, degrees)
  const [el, ctx] = canvas(area)
  ctx.translate(box.width / 2 - area.x, box.height / 2 - area.y)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return el
}

let resizer: Promise<ReturnType<typeof Pica>> | undefined

/** Shrinks to the upload size with a high-quality filter (pica, loaded on first use), optionally sharpened, as JPEG. */
export async function toJpeg(src: HTMLCanvasElement, sharpen: boolean): Promise<Blob> {
  resizer ??= import('pica').then(({ default: pica }) => pica())
  const [out] = canvas(fitEdge(src.width, src.height, MAX_EDGE))
  await (await resizer).resize(src, out, sharpen ? SHARPEN : {})
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Could not convert the image')
  return blob
}

/** The photo's name with `.jpg` in place of its own extension. */
export const jpegName = (name: string) => name.replace(/\.\w+$/, '') + '.jpg'
