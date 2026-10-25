import { useEffect, useState } from 'react'
import { imageUrl } from '#/guide/content/paths'
import type { ImageTopo } from '#/guide/model/types'

/** Old topos were saved without a width and height, so ask the browser for the photo's own size. */
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
  return { ...topo, width: known?.width ?? 4, height: known?.height ?? 3 }
}
