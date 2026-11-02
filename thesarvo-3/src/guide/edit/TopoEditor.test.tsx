import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
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

it('sets a belay on a selected middle point, and the end marker on the last when none is selected', () => {
  vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockReturnValue(new DOMMatrix())
  let latest: ImageTopo = newTopo('t', 'a.jpg', 400, 300)
  function Harness() {
    const [topo, setTopo] = useState(latest)
    return (
      <TopoEditor
        guideId="g"
        topo={topo}
        climbs={[]}
        newId={() => 'p1'}
        onChange={(update) => {
          latest = update(latest)
          setTopo(latest)
        }}
        kind="problem"
        onAddClimb={() => {}}
        onEditClimb={() => {}}
      />
    )
  }
  const { container } = render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Draw route' }))
  const svg = container.querySelector('svg[viewBox]')!
  for (const [x, y] of [[10, 200], [50, 100], [90, 20]]) fireEvent.click(svg, { clientX: x, clientY: y })
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByLabelText('End marker')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('End marker'), { target: { value: 'lower' } })
  expect(latest.paths[0].points.map((p) => p.kind)).toEqual(['', '', 'lower'])

  const handles = container.querySelectorAll('circle.cursor-grab')
  expect(handles).toHaveLength(3)
  fireEvent.pointerDown(handles[1])
  fireEvent.pointerUp(handles[1])
  fireEvent.change(screen.getByLabelText('Marker at selected point'), { target: { value: 'belay' } })
  expect(latest.paths[0].points.map((p) => p.kind)).toEqual(['', 'belay', 'lower'])
})
