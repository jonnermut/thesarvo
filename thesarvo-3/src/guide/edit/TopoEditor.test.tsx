import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ImageTopo } from '#/guide/model/types'
import { newTopo } from './newNodes'
import { TopoEditor } from './TopoEditor'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Draws on an empty topo, with the photo shown at its own size, and returns what each change made of it. */
function drawTwoPoints() {
  vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockReturnValue(new DOMMatrix())
  let topo: ImageTopo = newTopo('t', 'a.jpg', 400, 300)
  const onChange = vi.fn((update: (t: ImageTopo) => ImageTopo) => {
    topo = update(topo)
  })
  const { container } = render(
    <TopoEditor guideId="g" topo={topo} climbs={[]} newId={() => 'p1'} onChange={onChange} kind="problem" onAddClimb={() => {}} onEditClimb={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Draw route' }))
  const svg = container.querySelector('svg[viewBox]')
  if (!svg) throw new Error('no drawing surface')
  fireEvent.click(svg, { clientX: 10, clientY: 20 })
  fireEvent.click(svg, { clientX: 100, clientY: 200 })
  return { topo: () => topo }
}

it('keeps the route drawn so far when Done is pressed', () => {
  const { topo } = drawTwoPoints()
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(topo().paths.map((p) => p.points.map(({ x, y }) => [x, y]))).toEqual([[[10, 20], [100, 200]]])
})

it('throws the route away on Clear points', () => {
  const { topo } = drawTwoPoints()
  fireEvent.click(screen.getByRole('button', { name: 'Clear points' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(topo().paths).toEqual([])
})
