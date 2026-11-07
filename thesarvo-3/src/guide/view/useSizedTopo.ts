import { useEffect, useState } from 'react'
import { imageUrl } from '#/guide/content/paths'
import type { ImageTopo } from '#/guide/model/types'

/**
 * Old topos were saved without a width or a height (or only one), so ask the browser for the photo's own shape.
 * A size that was saved is the space the routes were drawn in, so it is kept and only the missing side follows the photo's proportions
 * (the phone apps keep a smaller copy of the photo, whose own pixel size would put the routes at the wrong scale).
 */
export function useSizedTopo(guideId: string, topo: ImageTopo): ImageTopo {
  const [size, setSize] = useState<{ src: string; width: number; height: number } | null>(null)
  const missing = !topo.width || !topo.height
  useEffect(() => {
    if (!missing) return
    const img = new Image()
    img.onload = () => setSize({ src: topo.src, width: img.naturalWidth, height: img.naturalHeight })
    img.src = imageUrl(guideId, topo.src)
  }, [missing, guideId, topo.src])
  if (!missing) return topo
  // Until the photo loads there is nothing to draw on: use a placeholder shape so layout stays stable.
  const known = size?.src === topo.src ? size : null
  const w = known?.width ?? 4
  const h = known?.height ?? 3
  return { ...topo, width: topo.width || (topo.height ? (topo.height * w) / h : w), height: topo.height || (topo.width ? (topo.width * h) / w : h) }
}
