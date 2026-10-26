import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { Gps, GpsPoint } from '#/guide/model/types'
import { GpsBlock } from './GpsBlock'

vi.mock('#/guide/islands/MapView', () => ({ default: () => null }))

const point = (pid: string, description: string): GpsPoint => ({ pid, code: '', description, zone: '55G', easting: '1', northing: '2', latitude: '-42.9', longitude: '147.3', height: '' })
const gps = (...points: GpsPoint[]): Gps => ({ type: 'gps', id: 'g', points, lines: [] })
const rows = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent)

it('lists every point, even where guides repeat a pid, and only the current guide’s', () => {
  const { rerender } = render(<GpsBlock gps={gps(point('0', 'Car park'), point('0', 'Boulder'))} />)
  fireEvent.click(screen.getByRole('button', { name: '2 points' }))
  expect(rows()).toEqual([expect.stringContaining('Car park'), expect.stringContaining('Boulder')])
  rerender(<GpsBlock gps={gps(point('0', 'Crag'))} />)
  expect(rows()).toEqual([expect.stringContaining('Crag')])
})
