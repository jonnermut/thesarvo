import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { RoutePath } from '#/guide/model/types'
import { coverSize, Route } from './Topo'

const path: RoutePath = {
  id: 'p1',
  points: [
    { x: 10, y: 100, kind: '' },
    { x: 20, y: 60, kind: 'belay' },
    { x: 30, y: 40, kind: 'lower' },
    { x: 40, y: 10, kind: 'belay' },
  ],
  d: 'M10,100L20,60L30,40L40,10',
  linkedTo: '',
  lineStyle: 'solid',
  labelText: '',
  arrow: false,
}

it('draws a marker at every belay and lower-off, not only the last point', () => {
  const { container } = render(
    <svg>
      <Route path={path} active={null} onActive={() => {}} />
    </svg>,
  )
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(container.querySelectorAll('path[transform]')).toHaveLength(1)
})

it('reads the size of the box a one-point path covers', () => {
  expect(coverSize({ ...path, other: { cover: '22,26' } })).toEqual({ w: 22, h: 26 })
  expect(coverSize(path)).toBeUndefined()
  expect(coverSize({ ...path, other: { cover: 'x' } })).toBeUndefined()
})
