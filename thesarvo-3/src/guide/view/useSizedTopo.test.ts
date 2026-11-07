import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { useSizedTopo } from './useSizedTopo'

/** An Image that loads at once as a 808 x 446 photo: half the size the routes were drawn on. */
class SmallImage {
  naturalWidth = 808
  naturalHeight = 446
  onload: () => void = () => {}
  set src(_: string) {
    queueMicrotask(() => this.onload())
  }
}

afterEach(() => vi.unstubAllGlobals())

const topo = (width: number, height: number) => ({ src: 'a.jpg', width, height }) as ImageTopo

it('keeps the saved height and sizes the missing width by the photo shape, whatever size the photo file is', async () => {
  vi.stubGlobal('Image', SmallImage)
  const { result } = renderHook(() => useSizedTopo('1', topo(0, 892)))
  await waitFor(() => expect(result.current.width).toBeCloseTo((892 * 808) / 446))
  expect(result.current.height).toBe(892)
})

it('takes both sides from the photo when neither was saved', async () => {
  vi.stubGlobal('Image', SmallImage)
  const { result } = renderHook(() => useSizedTopo('1', topo(0, 0)))
  await waitFor(() => expect(result.current.width).toBe(808))
  expect(result.current.height).toBe(446)
})
