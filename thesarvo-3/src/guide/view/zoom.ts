/** Where an image sits on screen: screen = (x, y) + scale × image point. */
export type View = { s: number; x: number; y: number }
export type Size = { w: number; h: number }

/** The scale that shows the whole image in the box. */
export const fitScale = (box: Size, image: Size) => Math.min(box.w / image.w, box.h / image.h)

/** Zooming stops at the whole image, and at four times that or 1.5 photo pixels per screen pixel, whichever is closer in. */
export const scaleRange = (box: Size, image: Size): [number, number] => {
  const fit = fitScale(box, image)
  return [fit, Math.max(fit * 4, 1.5)]
}

/** Centres the image on an axis it does not fill, and otherwise stops its edge coming inside the box. */
function clampAxis(offset: number, size: number, box: number) {
  return size <= box ? (box - size) / 2 : Math.min(0, Math.max(box - size, offset))
}

export function clampView(view: View, box: Size, image: Size): View {
  const [min, max] = scaleRange(box, image)
  const s = Math.min(max, Math.max(min, view.s))
  return { s, x: clampAxis(view.x, s * image.w, box.w), y: clampAxis(view.y, s * image.h, box.h) }
}

export const fitView = (box: Size, image: Size) => clampView({ s: 0, x: 0, y: 0 }, box, image)

/** Scales by `factor` keeping the image point under (px, py) where it is. */
export function zoomAt(view: View, factor: number, px: number, py: number, box: Size, image: Size): View {
  const [min, max] = scaleRange(box, image)
  const s = Math.min(max, Math.max(min, view.s * factor))
  const k = s / view.s
  return clampView({ s, x: px - (px - view.x) * k, y: py - (py - view.y) * k }, box, image)
}

export const panBy = (view: View, dx: number, dy: number, box: Size, image: Size) => clampView({ ...view, x: view.x + dx, y: view.y + dy }, box, image)
