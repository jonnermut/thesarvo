import { expect, it } from 'vitest'
import { leaderEnd, nearestT, pointAlong } from './geometry'

const pts = [{ x: 0, y: 0, kind: '' }, { x: 100, y: 0, kind: '' }, { x: 100, y: 100, kind: '' }]

it('finds the spot a fraction of the way along a route', () => {
  expect(pointAlong(pts, 0)).toEqual({ x: 0, y: 0 })
  expect(pointAlong(pts, 0.5)).toEqual({ x: 100, y: 0 })
  expect(pointAlong(pts, 0.75)).toEqual({ x: 100, y: 50 })
  expect(pointAlong(pts, 2)).toEqual({ x: 100, y: 100 })
  expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 })
})

it('finds how far along a route a spot is', () => {
  expect(nearestT(pts, { x: 100, y: 50 })).toBeCloseTo(0.75)
  expect(nearestT(pts, { x: -20, y: 5 })).toBe(0)
  expect(nearestT(pts, { x: 500, y: 500 })).toBe(1)
})

it('puts the leader line on the nearest edge of the box, and none when it is close', () => {
  const box = { x: 50, y: 50, width: 40, height: 20 }
  expect(leaderEnd(box, { x: 0, y: 60 })).toEqual({ x: 50, y: 60 })
  expect(leaderEnd(box, { x: 45, y: 60 })).toBeNull()
  expect(leaderEnd(box, { x: 60, y: 60 })).toBeNull()
})
